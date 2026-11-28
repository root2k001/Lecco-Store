/**
 * Tests de campañas (ej. "Colección de Verano"): gestión admin, visibilidad
 * por fechas, filtro ?campana= del catálogo y atribución de ventas por UTM.
 * Necesita TEST_DATABASE_URL local (la base se vacía en cada ejecución).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const urlSegura = (() => {
  try {
    return ['localhost', '127.0.0.1', 'db', 'host.docker.internal'].includes(new URL(TEST_DATABASE_URL).hostname);
  } catch {
    return false;
  }
})();

const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n) => new Date(Date.now() - n * DIA).toISOString();
const enDias = (n) => new Date(Date.now() + n * DIA).toISOString();

describe('Campañas', { skip: !urlSegura && 'define TEST_DATABASE_URL (PostgreSQL local de pruebas)' }, () => {
  let server, base, prisma, cookieAdmin, cookieCliente;
  const ids = {};

  const pedir = async (metodo, ruta, { body, cookie } = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
  };

  const login = async (email) => {
    const res = await pedir('POST', '/api/usuarios/login', { body: { email, password: 'Password123' } });
    assert.equal(res.status, 200);
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  };

  before(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = '';
    delete process.env.BREVO_API_KEY;

    const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npx prisma migrate deploy', { cwd: backendDir, env: { ...process.env }, stdio: 'pipe' });

    prisma = (await import('../src/prisma.js')).default;
    const app = (await import('../src/app.js')).default;
    const bcrypt = (await import('bcrypt')).default;

    await prisma.$executeRawUnsafe(
      'TRUNCATE "Campana","ItemPedido","Pedido","HistorialCambios","RefreshToken","PasswordResetToken","MensajeContacto","Producto","Usuario" RESTART IDENTITY CASCADE'
    );
    const hash = await bcrypt.hash('Password123', 10);
    await prisma.usuario.create({ data: { nombre: 'Admin', email: 'admin@test.local', password: hash, rol: 'admin' } });
    await prisma.usuario.create({ data: { nombre: 'Cliente', email: 'cliente@test.local', password: hash } });

    const crear = (nombre, precio) => prisma.producto.create({ data: { nombre, precio, genero: 'unisex', stock: 20 } });
    ids.verano1 = (await crear('Gafa Playa', '120.00')).id;
    ids.verano2 = (await crear('Gafa Sol Total', '80.00')).id;
    ids.otro = (await crear('Gafa Oficina', '200.00')).id;

    server = app.listen(0);
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
    cookieAdmin = await login('admin@test.local');
    cookieCliente = await login('cliente@test.local');
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    if (prisma) await prisma.$disconnect();
  });

  describe('Gestión (admin)', () => {
    it('crea la "Colección de Verano" con sus productos y lo registra en el historial', async () => {
      const res = await pedir('POST', '/api/campanas', {
        cookie: cookieAdmin,
        body: {
          slug: 'Verano-2027', titulo: 'Colección de Verano', descripcion: 'Gafas para el sol',
          banner: 'https://res.cloudinary.com/demo/banner.jpg',
          inicio: haceDias(1), fin: enDias(30), productoIds: [ids.verano1, ids.verano2]
        }
      });
      assert.equal(res.status, 201, JSON.stringify(res.data));
      assert.equal(res.data.slug, 'verano-2027'); // se normaliza a minúsculas
      assert.deepEqual(res.data.productos.map(p => p.id).sort(), [ids.verano1, ids.verano2].sort());
      ids.verano = res.data.id;

      const hist = await prisma.historialCambios.findFirst({ where: { accion: 'Creación de Campaña' } });
      assert.match(hist.detalle, /verano-2027/);
    });

    it('valida identificador, fechas y duplicados', async () => {
      const base_ = { titulo: 'X Campaña', inicio: haceDias(1), fin: enDias(5) };
      assert.equal((await pedir('POST', '/api/campanas', { cookie: cookieAdmin, body: { ...base_, slug: 'con espacios' } })).status, 400);
      const fechas = await pedir('POST', '/api/campanas', { cookie: cookieAdmin, body: { ...base_, slug: 'mal', inicio: enDias(5), fin: enDias(1) } });
      assert.equal(fechas.status, 400);
      assert.match(fechas.data.error, /posterior/);
      assert.equal((await pedir('POST', '/api/campanas', { cookie: cookieAdmin, body: { ...base_, slug: 'verano-2027' } })).status, 409);
      assert.equal((await pedir('POST', '/api/campanas', { cookie: cookieAdmin, body: { ...base_, slug: 'fantasma', productoIds: [99999] } })).status, 400);
    });

    it('un cliente no puede gestionar campañas', async () => {
      assert.equal((await pedir('GET', '/api/campanas', { cookie: cookieCliente })).status, 403);
      assert.equal((await pedir('POST', '/api/campanas', { cookie: cookieCliente, body: {} })).status, 403);
      assert.equal((await pedir('GET', '/api/campanas')).status, 401);
    });

    it('editar reemplaza la lista de productos', async () => {
      const res = await pedir('PUT', `/api/campanas/${ids.verano}`, {
        cookie: cookieAdmin, body: { productoIds: [ids.verano1, ids.verano2, ids.otro] }
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.productos.length, 3);

      const vuelta = await pedir('PUT', `/api/campanas/${ids.verano}`, {
        cookie: cookieAdmin, body: { productoIds: [ids.verano1, ids.verano2] }
      });
      assert.equal(vuelta.data.productos.length, 2);
    });

    it('al editar solo una fecha se valida contra la guardada', async () => {
      const res = await pedir('PUT', `/api/campanas/${ids.verano}`, { cookie: cookieAdmin, body: { fin: haceDias(5) } });
      assert.equal(res.status, 400);
    });
  });

  describe('Tienda', () => {
    before(async () => {
      // Campañas que NO deben verse: futura e inactiva
      await prisma.campana.create({ data: { slug: 'navidad', titulo: 'Navidad', inicio: new Date(enDias(10)), fin: new Date(enDias(40)), productos: { connect: [{ id: ids.otro }] } } });
      await prisma.campana.create({ data: { slug: 'pausada', titulo: 'Pausada', activa: false, inicio: new Date(haceDias(2)), fin: new Date(enDias(2)), productos: { connect: [{ id: ids.otro }] } } });
    });

    it('/activas solo muestra campañas activas y dentro de sus fechas', async () => {
      const { status, data } = await pedir('GET', '/api/campanas/activas');
      assert.equal(status, 200);
      assert.deepEqual(data.map(c => c.slug), ['verano-2027']);
      assert.equal(data[0].titulo, 'Colección de Verano');
    });

    it('/slug/:slug devuelve la vigente y 404 para futuras, pausadas o inexistentes', async () => {
      assert.equal((await pedir('GET', '/api/campanas/slug/verano-2027')).status, 200);
      for (const slug of ['navidad', 'pausada', 'no-existe', 'MAL%20slug']) {
        assert.equal((await pedir('GET', `/api/campanas/slug/${slug}`)).status, 404, slug);
      }
    });

    it('?campana= filtra el catálogo por los productos de la campaña', async () => {
      const { data } = await pedir('GET', '/api/productos?campana=verano-2027');
      assert.deepEqual(data.productos.map(p => p.id).sort(), [ids.verano1, ids.verano2].sort());
      assert.equal(data.total, 2);
    });

    it('?campana= de una campaña no vigente no muestra productos', async () => {
      assert.equal((await pedir('GET', '/api/productos?campana=navidad')).data.total, 0);
      assert.equal((await pedir('GET', '/api/productos?campana=pausada')).data.total, 0);
    });
  });

  describe('Atribución de ventas (UTM)', () => {
    it('un pedido con utm de una campaña existente guarda origenCampana', async () => {
      const res = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId: ids.verano1, cantidad: 2 }], origenCampana: 'Verano-2027' } });
      assert.equal(res.status, 201);
      assert.equal(res.data.pedido.origenCampana, 'verano-2027');
      ids.pedidoVerano = res.data.pedido.id;
    });

    it('un utm inexistente o con formato inválido se ignora sin romper la compra', async () => {
      const inexistente = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId: ids.otro, cantidad: 1 }], origenCampana: 'no-existe' } });
      assert.equal(inexistente.status, 201);
      assert.equal(inexistente.data.pedido.origenCampana, null);

      const invalido = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId: ids.otro, cantidad: 1 }], origenCampana: '<script>' } });
      assert.equal(invalido.status, 201);
      assert.equal(invalido.data.pedido.origenCampana, null);
    });

    it('las métricas muestran las ventas por campaña sin contar cancelados', async () => {
      await pedir('POST', '/api/pedidos', { body: { items: [{ productoId: ids.verano2, cantidad: 1 }], origenCampana: 'verano-2027' } });
      const cancelado = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId: ids.verano2, cantidad: 3 }], origenCampana: 'verano-2027' } });
      await pedir('PUT', `/api/pedidos/admin/estado/${cancelado.data.pedido.id}`, { cookie: cookieAdmin, body: { estado: 'cancelado' } });

      const { data } = await pedir('GET', '/api/stats', { cookie: cookieAdmin });
      // 2×120 + 1×80 = 320 (el cancelado de 240 no suma)
      assert.deepEqual(data.ventasPorCampana, [{ campana: 'verano-2027', pedidos: 2, ingresos: 320 }]);
    });
  });

  describe('Eliminación', () => {
    it('borrar una campaña no borra sus productos ni la atribución de pedidos', async () => {
      assert.equal((await pedir('DELETE', `/api/campanas/${ids.verano}`, { cookie: cookieAdmin })).status, 200);
      assert.ok(await prisma.producto.findUnique({ where: { id: ids.verano1 } }));
      const pedido = await prisma.pedido.findUnique({ where: { id: ids.pedidoVerano } });
      assert.equal(pedido.origenCampana, 'verano-2027');
      assert.equal((await pedir('GET', '/api/productos?campana=verano-2027')).data.total, 0);
    });
  });
});
