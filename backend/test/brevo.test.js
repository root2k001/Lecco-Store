/**
 * Tests de la integración con Brevo. Brevo se SIMULA (no se llama a la API real).
 * - brevoService: unitarios, no necesitan base de datos.
 * - Flujo (registro, perfil, pedidos, newsletter, webhook): necesitan TEST_DATABASE_URL
 *   local, igual que flujo-negocio.test.js (la base se vacía en cada ejecución).
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ── Simulación de Brevo: intercepta fetch a api.brevo.com y deja pasar el resto ──
const fetchReal = globalThis.fetch;
const brevo = {
  llamadas: [],
  caido: false,
  reset() { this.llamadas = []; this.caido = false; }
};
globalThis.fetch = async (url, opciones = {}) => {
  const u = String(url);
  if (!u.startsWith('https://api.brevo.com/')) return fetchReal(url, opciones);
  brevo.llamadas.push({
    metodo: opciones.method || 'GET',
    ruta: u.replace('https://api.brevo.com/v3', ''),
    headers: opciones.headers || {},
    body: opciones.body ? JSON.parse(opciones.body) : null
  });
  if (brevo.caido) throw new Error('ECONNREFUSED (simulado)');
  const status = u.endsWith('/events') ? 204 : 201;
  return new Response(status === 204 ? null : '{}', { status });
};

const configurarBrevo = () => {
  process.env.BREVO_API_KEY = 'xkeysib-test';
  process.env.BREVO_LISTA_CLIENTES_ID = '11';
  process.env.BREVO_LISTA_NEWSLETTER_ID = '22';
  process.env.BREVO_DOI_TEMPLATE_ID = '5';
  process.env.BREVO_DOI_REDIRECT_URL = 'http://localhost:5173/?suscripcion=confirmada';
  process.env.BREVO_WEBHOOK_TOKEN = 'token-webhook-test';
};

// Espera a que llegue una llamada (las de Brevo son fire-and-forget)
const esperarLlamada = async (predicado, ms = 3000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    const llamada = brevo.llamadas.find(predicado);
    if (llamada) return llamada;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.fail(`No llegó la llamada esperada a Brevo. Llamadas: ${JSON.stringify(brevo.llamadas.map(l => `${l.metodo} ${l.ruta}`))}`);
};

// ── 1. brevoService (sin base de datos) ─────────────────────────────────────
describe('brevoService', () => {
  let servicio;
  before(async () => { servicio = await import('../src/services/brevoService.js'); });
  beforeEach(() => { brevo.reset(); configurarBrevo(); });

  it('sin BREVO_API_KEY no llama a Brevo (no-op)', async () => {
    delete process.env.BREVO_API_KEY;
    const r = await servicio.sincronizarContacto({ email: 'a@test.local', nombre: 'A' });
    assert.equal(r.omitido, true);
    assert.equal(brevo.llamadas.length, 0);
  });

  it('si Brevo está caído no lanza errores', async () => {
    brevo.caido = true;
    const r = await servicio.sincronizarContacto({ email: 'a@test.local', nombre: 'A' });
    assert.equal(r.ok, false);
  });

  it('crea/actualiza el contacto con la API key, atributos y listas', async () => {
    await servicio.sincronizarContacto({
      email: 'a@test.local', nombre: 'Ana', origen: 'registro', enNewsletter: true,
      estadisticas: { numPedidos: 2, totalGastado: 150.5, ultimaCompra: new Date('2026-11-20T10:00:00Z') }
    });
    const [llamada] = brevo.llamadas;
    assert.equal(llamada.metodo, 'POST');
    assert.equal(llamada.ruta, '/contacts');
    assert.equal(llamada.headers['api-key'], 'xkeysib-test');
    assert.deepEqual(llamada.body, {
      email: 'a@test.local',
      attributes: { FIRSTNAME: 'Ana', ORIGEN: 1, NUM_PEDIDOS: 2, TOTAL_GASTADO: 150.5, ULTIMA_COMPRA: '2026-11-20' },
      listIds: [11, 22],
      updateEnabled: true
    });
  });

  it('retirar el consentimiento saca al contacto de la lista Newsletter', async () => {
    await servicio.sincronizarContacto({ email: 'a@test.local', enNewsletter: false });
    assert.deepEqual(brevo.llamadas[0].body.listIds, [11]);
    const baja = brevo.llamadas[1];
    assert.equal(baja.metodo, 'PUT');
    assert.equal(baja.ruta, '/contacts/a%40test.local');
    assert.deepEqual(baja.body, { unlinkListIds: [22] });
  });

  it('envía eventos con el formato de la API de eventos', async () => {
    await servicio.registrarEvento('a@test.local', 'pedido_creado', { pedido_id: 7 });
    assert.deepEqual(brevo.llamadas[0], {
      metodo: 'POST', ruta: '/events', headers: brevo.llamadas[0].headers,
      body: { event_name: 'pedido_creado', identifiers: { email_id: 'a@test.local' }, event_properties: { pedido_id: 7 } }
    });
  });
});

// ── 2. Flujo con base de datos ──────────────────────────────────────────────
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const urlSegura = (() => {
  try {
    return ['localhost', '127.0.0.1', 'db', 'host.docker.internal'].includes(new URL(TEST_DATABASE_URL).hostname);
  } catch {
    return false;
  }
})();

describe('Integración Brevo en la tienda', { skip: !urlSegura && 'define TEST_DATABASE_URL (PostgreSQL local de pruebas)' }, () => {
  let server, base, prisma, productoId;

  const pedir = async (metodo, ruta, { body, cookie, headers = {} } = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
  };

  const registrarYEntrar = async (email, aceptaMarketing) => {
    const reg = await pedir('POST', '/api/usuarios/registro', {
      body: { nombre: 'Cliente Brevo', email, password: 'Password123', ...(aceptaMarketing !== undefined ? { aceptaMarketing } : {}) }
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.data));
    const login = await pedir('POST', '/api/usuarios/login', { body: { email, password: 'Password123' } });
    return { reg, cookie: login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
  };

  before(async () => {
    configurarBrevo();
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = '';

    const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npx prisma migrate deploy', { cwd: backendDir, env: { ...process.env }, stdio: 'pipe' });

    prisma = (await import('../src/prisma.js')).default;
    const app = (await import('../src/app.js')).default;

    await prisma.$executeRawUnsafe(
      'TRUNCATE "Campana","ItemPedido","Pedido","HistorialCambios","RefreshToken","PasswordResetToken","MensajeContacto","Producto","Usuario" RESTART IDENTITY CASCADE'
    );
    productoId = (await prisma.producto.create({ data: { nombre: 'Gafa', precio: '100.00', genero: 'unisex', stock: 10 } })).id;

    server = app.listen(0);
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(() => { brevo.reset(); configurarBrevo(); });

  it('registro SIN consentimiento: solo lista Clientes y aceptaMarketing=false', async () => {
    const { reg } = await registrarYEntrar('sin@test.local');
    assert.equal(reg.data.usuario.aceptaMarketing, false);
    const llamada = await esperarLlamada(l => l.ruta === '/contacts' && l.body.email === 'sin@test.local');
    assert.deepEqual(llamada.body.listIds, [11]);
    assert.equal(llamada.body.attributes.ORIGEN, 1); // categoría "registro"
    assert.equal(llamada.body.attributes.FIRSTNAME, 'Cliente Brevo');
    const u = await prisma.usuario.findUnique({ where: { email: 'sin@test.local' } });
    assert.equal(u.consentimientoEn, null);
  });

  it('registro CON consentimiento: listas Clientes + Newsletter y fecha de consentimiento', async () => {
    const { reg } = await registrarYEntrar('con@test.local', true);
    assert.equal(reg.data.usuario.aceptaMarketing, true);
    const llamada = await esperarLlamada(l => l.ruta === '/contacts' && l.body.email === 'con@test.local');
    assert.deepEqual(llamada.body.listIds, [11, 22]);
    const u = await prisma.usuario.findUnique({ where: { email: 'con@test.local' } });
    assert.ok(u.consentimientoEn instanceof Date);
  });

  it('una compra actualiza las estadísticas del cliente y envía "pedido_creado"', async () => {
    const { cookie } = await registrarYEntrar('compra@test.local');
    brevo.reset();
    const res = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId, cantidad: 2 }] }, cookie });
    assert.equal(res.status, 201);

    const contacto = await esperarLlamada(l => l.ruta === '/contacts' && l.body.email === 'compra@test.local');
    assert.equal(contacto.body.attributes.NUM_PEDIDOS, 1);
    assert.equal(contacto.body.attributes.TOTAL_GASTADO, 200);
    assert.match(contacto.body.attributes.ULTIMA_COMPRA, /^\d{4}-\d{2}-\d{2}$/);

    const evento = await esperarLlamada(l => l.ruta === '/events');
    assert.equal(evento.body.event_name, 'pedido_creado');
    assert.deepEqual(evento.body.identifiers, { email_id: 'compra@test.local' });
    assert.equal(evento.body.event_properties.pedido_id, res.data.pedido.id);
    assert.equal(evento.body.event_properties.num_productos, 2);
  });

  it('si Brevo está caído, el registro y la compra funcionan igual', async () => {
    brevo.caido = true;
    const { cookie } = await registrarYEntrar('caido@test.local', true);
    const res = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId, cantidad: 1 }] }, cookie });
    assert.equal(res.status, 201);
  });

  it('retirar el consentimiento desde el perfil lo quita de la Newsletter', async () => {
    const login = await pedir('POST', '/api/usuarios/login', { body: { email: 'con@test.local', password: 'Password123' } });
    const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    brevo.reset();

    const res = await pedir('PUT', '/api/usuarios/perfil', { body: { aceptaMarketing: false }, cookie });
    assert.equal(res.status, 200);
    assert.equal(res.data.usuario.aceptaMarketing, false);
    await esperarLlamada(l => l.metodo === 'PUT' && l.ruta === '/contacts/con%40test.local' && l.body.unlinkListIds?.[0] === 22);

    const u = await prisma.usuario.findUnique({ where: { email: 'con@test.local' } });
    assert.equal(u.aceptaMarketing, false);
    assert.equal(u.consentimientoEn, null);

    const me = await pedir('GET', '/api/usuarios/me', { cookie });
    assert.equal(me.data.usuario.aceptaMarketing, false);
  });

  it('newsletter: pide doble opt-in a Brevo y valida el correo', async () => {
    const ok = await pedir('POST', '/api/newsletter', { body: { email: 'Lector@Test.local', nombre: 'Lector' } });
    assert.equal(ok.status, 200);
    const doi = brevo.llamadas.find(l => l.ruta === '/contacts/doubleOptinConfirmation');
    assert.deepEqual(doi.body, {
      email: 'lector@test.local',
      includeListIds: [22],
      templateId: 5,
      redirectionUrl: 'http://localhost:5173/?suscripcion=confirmada',
      attributes: { FIRSTNAME: 'Lector', ORIGEN: 2 }
    });

    assert.equal((await pedir('POST', '/api/newsletter', { body: { email: 'no-es-email' } })).status, 400);
  });

  it('newsletter sin plantilla de doble opt-in configurada responde 503', async () => {
    delete process.env.BREVO_DOI_TEMPLATE_ID;
    assert.equal((await pedir('POST', '/api/newsletter', { body: { email: 'x@test.local' } })).status, 503);
    assert.equal(brevo.llamadas.length, 0);
  });

  it('webhook: rechaza peticiones sin el token correcto', async () => {
    const evento = { event: 'unsubscribe', email: 'sin@test.local' };
    assert.equal((await pedir('POST', '/api/webhooks/brevo', { body: evento })).status, 401);
    assert.equal((await pedir('POST', '/api/webhooks/brevo?token=malo', { body: evento })).status, 401);
  });

  it('webhook: una baja en Brevo retira el consentimiento (también en lote y con Bearer)', async () => {
    await prisma.usuario.update({ where: { email: 'caido@test.local' }, data: { aceptaMarketing: true } });
    await prisma.usuario.update({ where: { email: 'compra@test.local' }, data: { aceptaMarketing: true } });

    const uno = await pedir('POST', '/api/webhooks/brevo?token=token-webhook-test', {
      body: { event: 'unsubscribe', email: 'CAIDO@test.local', list_id: [22] }
    });
    assert.equal(uno.status, 200);
    assert.equal((await prisma.usuario.findUnique({ where: { email: 'caido@test.local' } })).aceptaMarketing, false);

    const lote = await pedir('POST', '/api/webhooks/brevo', {
      headers: { Authorization: 'Bearer token-webhook-test' },
      body: [{ event: 'opened', email: 'compra@test.local' }, { event: 'unsubscribe', email: 'compra@test.local' }]
    });
    assert.deepEqual(lote.data, { recibidos: 2, bajas: 1 });
    assert.equal((await prisma.usuario.findUnique({ where: { email: 'compra@test.local' } })).aceptaMarketing, false);
  });
});
