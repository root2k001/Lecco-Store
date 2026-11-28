/**
 * Test de integración del flujo de negocio de Lecco Store:
 * catálogo → pedido (invitado y cliente) → stock → gestión admin → métricas.
 *
 * Usa una base PostgreSQL de PRUEBAS que se vacía en cada ejecución.
 * Por seguridad solo se ejecuta si TEST_DATABASE_URL apunta a un host local.
 *
 * Cómo ejecutarlo (desde /backend):
 *   docker compose up -d db
 *   docker exec lecco-postgres psql -U postgres -c "CREATE DATABASE lecco_test;"
 *   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lecco_test" pnpm test
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const HOSTS_PERMITIDOS = ['localhost', '127.0.0.1', 'db', 'host.docker.internal'];

const urlSegura = (() => {
  if (!TEST_DATABASE_URL) return false;
  try {
    return HOSTS_PERMITIDOS.includes(new URL(TEST_DATABASE_URL).hostname);
  } catch {
    return false;
  }
})();

if (!urlSegura) {
  console.warn('[test] Omitido: define TEST_DATABASE_URL con una base PostgreSQL LOCAL de pruebas (se vacía en cada ejecución).');
}

describe('Flujo de negocio Lecco Store', { skip: !urlSegura }, () => {
  let server;
  let base;
  let prisma;
  let cookieAdmin;
  let cookieCliente;
  const ids = {};

  // ── Helpers HTTP ──────────────────────────────────────────────────────────
  const pedir = async (metodo, ruta, { body, cookie } = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  };

  const login = async (email, password) => {
    const res = await pedir('POST', '/api/usuarios/login', { body: { email, password } });
    assert.equal(res.status, 200, `login de ${email} falló: ${JSON.stringify(res.data)}`);
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  };

  const stockDe = async (id) => (await prisma.producto.findUnique({ where: { id } })).stock;

  const crearPedido = (items, cookie) =>
    pedir('POST', '/api/pedidos', { body: { items, direccion: 'Av. Test 123', ciudad: 'Lima' }, cookie });

  // ── Preparación ───────────────────────────────────────────────────────────
  before(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = ''; // nunca enviar emails reales

    const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npx prisma migrate deploy', {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe'
    });

    // Importar después de fijar DATABASE_URL (PrismaClient lo lee al crearse)
    prisma = (await import('../src/prisma.js')).default;
    const app = (await import('../src/app.js')).default;
    const bcrypt = (await import('bcrypt')).default;

    await prisma.$executeRawUnsafe(
      'TRUNCATE "Campana","ItemPedido","Pedido","HistorialCambios","RefreshToken","PasswordResetToken","MensajeContacto","Producto","Usuario" RESTART IDENTITY CASCADE'
    );

    const hash = await bcrypt.hash('Password123', 10);
    await prisma.usuario.create({ data: { nombre: 'Admin', email: 'admin@test.local', password: hash, rol: 'admin' } });
    await prisma.usuario.create({ data: { nombre: 'Cliente', email: 'cliente@test.local', password: hash } });

    const crear = (data) => prisma.producto.create({ data: { genero: 'unisex', ...data } });
    ids.oferta = (await crear({ nombre: 'Gafa Oferta', precio: '19.99', stock: 10, sale: true, color: 'Negro' })).id;
    ids.coleccion = (await crear({ nombre: 'Gafa Colección', precio: '150.00', stock: 5, coleccion: true })).id;
    ids.ultima = (await crear({ nombre: 'Gafa Última Unidad', precio: '80.00', stock: 1 })).id;
    ids.agotada = (await crear({ nombre: 'Gafa Agotada', precio: '60.00', stock: 0 })).id;

    server = app.listen(0);
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;

    cookieAdmin = await login('admin@test.local', 'Password123');
    cookieCliente = await login('cliente@test.local', 'Password123');
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    if (prisma) await prisma.$disconnect();
  });

  // ── 1. Catálogo ───────────────────────────────────────────────────────────
  describe('Catálogo', () => {
    it('/Sale: ?sale=true devuelve solo productos en oferta, con paginación', async () => {
      const { status, data } = await pedir('GET', '/api/productos?sale=true');
      assert.equal(status, 200);
      assert.equal(data.total, 1);
      assert.equal(data.productos[0].id, ids.oferta);
      assert.equal(data.page, 1);
      assert.equal(data.totalPages, 1);
    });

    it('/Coleccion: ?coleccion=true filtra la colección', async () => {
      const { data } = await pedir('GET', '/api/productos?coleccion=true');
      assert.deepEqual(data.productos.map(p => p.id), [ids.coleccion]);
    });

    it('ordena por precio de menor a mayor', async () => {
      const { data } = await pedir('GET', '/api/productos?orden=menor_mayor');
      const precios = data.productos.map(p => Number(p.precio));
      assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
    });

    it('un :id no numérico responde 400 y uno inexistente 404', async () => {
      assert.equal((await pedir('GET', '/api/productos/abc')).status, 400);
      assert.equal((await pedir('GET', '/api/productos/99999')).status, 404);
    });
  });

  // ── 2. Pedidos ────────────────────────────────────────────────────────────
  describe('Pedidos', () => {
    it('un invitado compra: el total sale de la BD (no del cliente) y se descuenta el stock', async () => {
      const res = await pedir('POST', '/api/pedidos', {
        body: {
          total: 1, // valores manipulados desde el frontend: deben ignorarse
          items: [{ productoId: ids.oferta, cantidad: 3, precio: 0.01 }]
        }
      });
      assert.equal(res.status, 201);
      const pedido = res.data.pedido;
      assert.equal(pedido.usuarioId, null);
      assert.equal(pedido.estado, 'pendiente');
      assert.equal(pedido.total, '59.97'); // 19.99 × 3 exacto (Decimal, sin errores de coma flotante)
      assert.equal(pedido.items[0].precioUnit, '19.99');
      assert.equal(pedido.items[0].color, 'Negro'); // copia del color al comprar
      assert.equal(await stockDe(ids.oferta), 7);
      ids.pedidoInvitado = pedido.id;
    });

    it('rechaza (400) un pedido con stock insuficiente y no toca el stock', async () => {
      const res = await crearPedido([{ productoId: ids.agotada, cantidad: 1 }]);
      assert.equal(res.status, 400);
      assert.match(res.data.error, /Stock insuficiente/);
      assert.equal(await stockDe(ids.agotada), 0);
    });

    it('rechaza (400) un producto inexistente', async () => {
      const res = await crearPedido([{ productoId: 99999, cantidad: 1 }]);
      assert.equal(res.status, 400);
    });

    it('si falla un ítem, no se descuenta el stock de ningún otro (transacción)', async () => {
      const antes = await stockDe(ids.coleccion);
      const res = await crearPedido([
        { productoId: ids.coleccion, cantidad: 1 },
        { productoId: ids.agotada, cantidad: 1 }
      ]);
      assert.equal(res.status, 400);
      assert.equal(await stockDe(ids.coleccion), antes);
    });

    it('con 5 compras simultáneas de la última unidad, solo una se confirma', async () => {
      const resultados = await Promise.all(
        Array.from({ length: 5 }, () => crearPedido([{ productoId: ids.ultima, cantidad: 1 }]))
      );
      const exitosos = resultados.filter(r => r.status === 201);
      assert.equal(exitosos.length, 1);
      assert.equal(resultados.filter(r => r.status === 400).length, 4);
      assert.equal(await stockDe(ids.ultima), 0);
      ids.pedidoUltima = exitosos[0].data.pedido.id;
    });

    it('un cliente logueado compra y ve el pedido en /mis-pedidos', async () => {
      const res = await crearPedido([{ productoId: ids.coleccion, cantidad: 2 }], cookieCliente);
      assert.equal(res.status, 201);
      assert.ok(res.data.pedido.usuarioId);
      ids.pedidoCliente = res.data.pedido.id;

      const mis = await pedir('GET', '/api/pedidos/mis-pedidos', { cookie: cookieCliente });
      assert.equal(mis.status, 200);
      assert.deepEqual(mis.data.map(p => p.id), [ids.pedidoCliente]);
      assert.equal(mis.data[0].items[0].producto.nombre, 'Gafa Colección');
    });

    it('/mis-pedidos exige sesión', async () => {
      assert.equal((await pedir('GET', '/api/pedidos/mis-pedidos')).status, 401);
    });
  });

  // ── 3. Gestión del administrador ──────────────────────────────────────────
  describe('Administración de pedidos', () => {
    it('un cliente no puede ver ni modificar pedidos de la tienda (403)', async () => {
      assert.equal((await pedir('GET', '/api/pedidos/admin/todos', { cookie: cookieCliente })).status, 403);
      const res = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoInvitado}`, {
        body: { estado: 'enviado' }, cookie: cookieCliente
      });
      assert.equal(res.status, 403);
    });

    it('el admin ve todos los pedidos', async () => {
      const { status, data } = await pedir('GET', '/api/pedidos/admin/todos', { cookie: cookieAdmin });
      assert.equal(status, 200);
      assert.equal(data.length, 3);
    });

    it('valida estado e :id del pedido (400)', async () => {
      const malo = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoInvitado}`, {
        body: { estado: 'perdido' }, cookie: cookieAdmin
      });
      assert.equal(malo.status, 400);
      const idMalo = await pedir('PUT', '/api/pedidos/admin/estado/abc', {
        body: { estado: 'enviado' }, cookie: cookieAdmin
      });
      assert.equal(idMalo.status, 400);
    });

    it('avanza el estado y lo registra en el historial', async () => {
      const res = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoCliente}`, {
        body: { estado: 'enviado' }, cookie: cookieAdmin
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.estado, 'enviado');

      const hist = await pedir('GET', '/api/historial', { cookie: cookieAdmin });
      assert.ok(hist.data.some(h => h.accion === 'Cambio de Estado de Pedido' && h.detalle.includes(`#${ids.pedidoCliente}`)));
    });

    it('cancelar devuelve el stock y registra el motivo', async () => {
      const res = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoInvitado}`, {
        body: { estado: 'cancelado', motivo: 'Cliente desistió' }, cookie: cookieAdmin
      });
      assert.equal(res.status, 200);
      assert.equal(await stockDe(ids.oferta), 10);

      const hist = await pedir('GET', '/api/historial', { cookie: cookieAdmin });
      assert.ok(hist.data.some(h => h.accion === 'Cancelación de Pedido' && h.detalle.includes('Cliente desistió')));
    });

    it('reactivar un cancelado vuelve a descontar el stock', async () => {
      const res = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoInvitado}`, {
        body: { estado: 'pendiente' }, cookie: cookieAdmin
      });
      assert.equal(res.status, 200);
      assert.equal(await stockDe(ids.oferta), 7);
    });

    it('no se puede reactivar un pedido si su stock ya se vendió (sin stock negativo)', async () => {
      // Cancelar libera la última unidad...
      await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoUltima}`, {
        body: { estado: 'cancelado' }, cookie: cookieAdmin
      });
      assert.equal(await stockDe(ids.ultima), 1);
      // ...otro cliente la compra...
      assert.equal((await crearPedido([{ productoId: ids.ultima, cantidad: 1 }])).status, 201);
      // ...y reactivar el pedido original debe fallar sin dejar stock negativo
      const res = await pedir('PUT', `/api/pedidos/admin/estado/${ids.pedidoUltima}`, {
        body: { estado: 'pendiente' }, cookie: cookieAdmin
      });
      assert.equal(res.status, 400);
      assert.equal(await stockDe(ids.ultima), 0);
      const pedido = await prisma.pedido.findUnique({ where: { id: ids.pedidoUltima } });
      assert.equal(pedido.estado, 'cancelado');
    });
  });

  // ── 4. Métricas ───────────────────────────────────────────────────────────
  describe('Métricas del dashboard', () => {
    it('los ingresos excluyen pedidos cancelados y el conteo por estado cuadra', async () => {
      const { status, data } = await pedir('GET', '/api/stats', { cookie: cookieAdmin });
      assert.equal(status, 200);
      // Activos: invitado 59.97 (pendiente) + cliente 300.00 (enviado) + última unidad 80.00 (pendiente)
      // Cancelado (no suma): pedidoUltima 80.00
      assert.equal(data.ingresosTotales, 439.97);
      assert.equal(data.totalPedidos, 4);
      assert.deepEqual(data.pedidosPorEstado, { pendiente: 2, procesando: 0, enviado: 1, entregado: 0, cancelado: 1 });
      assert.equal(data.totalClientes, 1);
      assert.ok(data.productosBajoStock.some(p => p.id === ids.agotada));
    });

    it('las métricas son solo para admin', async () => {
      assert.equal((await pedir('GET', '/api/stats', { cookie: cookieCliente })).status, 403);
      assert.equal((await pedir('GET', '/api/stats')).status, 401);
    });
  });

  // ── 5. Gestión de productos ───────────────────────────────────────────────
  describe('Administración de productos', () => {
    it('el admin crea un producto en oferta y aparece en /Sale', async () => {
      const res = await pedir('POST', '/api/productos', {
        body: { nombre: 'Gafa Nueva', precio: 99.5, genero: 'unisex', stock: 4, sale: true },
        cookie: cookieAdmin
      });
      assert.equal(res.status, 201);
      ids.nuevo = res.data.id;
      const { data } = await pedir('GET', '/api/productos?sale=true');
      assert.ok(data.productos.some(p => p.id === ids.nuevo));
    });

    it('cambiar el stock queda registrado en el historial', async () => {
      const res = await pedir('PUT', `/api/productos/${ids.nuevo}`, { body: { stock: 9 }, cookie: cookieAdmin });
      assert.equal(res.status, 200);
      const hist = await pedir('GET', '/api/historial', { cookie: cookieAdmin });
      assert.ok(hist.data.some(h => h.accion === 'Actualización de Stock' && h.detalle.includes('de 4 a 9')));
    });

    it('no se puede borrar un producto que ya se vendió (protege el historial de ventas)', async () => {
      const res = await pedir('DELETE', `/api/productos/${ids.oferta}`, { cookie: cookieAdmin });
      assert.equal(res.status, 400);
      assert.ok(await prisma.producto.findUnique({ where: { id: ids.oferta } }));
    });

    it('un producto sin ventas sí se puede borrar', async () => {
      assert.equal((await pedir('DELETE', `/api/productos/${ids.nuevo}`, { cookie: cookieAdmin })).status, 200);
    });

    it('un cliente no puede crear productos (403)', async () => {
      const res = await pedir('POST', '/api/productos', {
        body: { nombre: 'Hack', precio: 1, genero: 'x', stock: 1 }, cookie: cookieCliente
      });
      assert.equal(res.status, 403);
    });
  });

  // ── 6. Autenticación ──────────────────────────────────────────────────────
  describe('Autenticación', () => {
    it('datos inválidos devuelven 400 con mensaje (no 500)', async () => {
      const res = await pedir('POST', '/api/usuarios/login', { body: { email: 'no-es-email', password: 'x' } });
      assert.equal(res.status, 400);
      assert.match(res.data.error, /correo/);
    });

    it('usuario inexistente y contraseña errónea responden igual (401)', async () => {
      const a = await pedir('POST', '/api/usuarios/login', { body: { email: 'nadie@test.local', password: 'x' } });
      const b = await pedir('POST', '/api/usuarios/login', { body: { email: 'cliente@test.local', password: 'mala' } });
      assert.equal(a.status, 401);
      assert.equal(b.status, 401);
      assert.equal(a.data.error, b.data.error);
    });
  });
});
