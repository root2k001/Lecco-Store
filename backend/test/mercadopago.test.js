/**
 * Tests de la pasarela Mercado Pago. MP se SIMULA (no se llama a la API real).
 * - mercadoPagoService: unitarios, no necesitan base de datos.
 * - Flujo (pedido → preferencia → webhook/retorno): necesitan TEST_DATABASE_URL
 *   local, igual que flujo-negocio.test.js (la base se vacía en cada ejecución).
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ── Simulación de Mercado Pago: intercepta fetch a api.mercadopago.com ──────
const fetchReal = globalThis.fetch;
const mp = {
  llamadas: [],
  caido: false,
  pagos: {}, // id → respuesta de GET /v1/payments/:id
  reset() { this.llamadas = []; this.caido = false; this.pagos = {}; }
};
globalThis.fetch = async (url, opciones = {}) => {
  const u = String(url);
  if (!u.startsWith('https://api.mercadopago.com/')) return fetchReal(url, opciones);
  const ruta = u.replace('https://api.mercadopago.com', '');
  mp.llamadas.push({
    metodo: opciones.method || 'GET',
    ruta,
    headers: opciones.headers || {},
    body: opciones.body ? JSON.parse(opciones.body) : null
  });
  if (mp.caido) return new Response(JSON.stringify({ message: 'caído (simulado)' }), { status: 500 });
  if (ruta === '/checkout/preferences') {
    return new Response(JSON.stringify({
      id: 'pref-123',
      init_point: 'https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref-123',
      sandbox_init_point: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref-123'
    }), { status: 201 });
  }
  const pago = mp.pagos[ruta.replace('/v1/payments/', '')];
  return pago
    ? new Response(JSON.stringify(pago), { status: 200 })
    : new Response(JSON.stringify({ message: 'Payment not found' }), { status: 404 });
};

const SECRETO = 'secreto-webhook-test';
const configurarMP = () => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRETO;
  process.env.FRONTEND_URL = 'https://tienda.test';
  process.env.BACKEND_PUBLIC_URL = 'https://api.tienda.test';
};

const firmar = (dataId, requestId, ts = '1704908010') => {
  const v1 = crypto.createHmac('sha256', SECRETO).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  return `ts=${ts},v1=${v1}`;
};

// ── 1. mercadoPagoService (sin base de datos) ───────────────────────────────
describe('mercadoPagoService', () => {
  let servicio;
  before(async () => { servicio = await import('../src/services/mercadoPagoService.js'); });
  beforeEach(() => { mp.reset(); configurarMP(); });

  it('mercadoPagoHabilitado depende del access token', () => {
    assert.equal(servicio.mercadoPagoHabilitado(), true);
    process.env.MERCADOPAGO_ACCESS_TOKEN = '';
    assert.equal(servicio.mercadoPagoHabilitado(), false);
  });

  it('construirPreferencia usa precios de BD, PEN, referencia y URLs públicas', () => {
    const pref = servicio.construirPreferencia(
      { id: 7 },
      [{ productoId: 3, nombre: 'Gafa', cantidad: 2, precioUnit: '19.90' }],
      new Date('2026-01-01T00:00:00Z')
    );
    assert.deepEqual(pref.items, [{ id: '3', title: 'Gafa', quantity: 2, unit_price: 19.9, currency_id: 'PEN' }]);
    assert.equal(pref.external_reference, '7');
    assert.equal(pref.back_urls.success, 'https://tienda.test/pago/resultado');
    assert.equal(pref.auto_return, 'approved');
    assert.equal(pref.notification_url, 'https://api.tienda.test/api/webhooks/mercadopago');
    assert.equal(pref.expiration_date_to, '2026-01-02T00:00:00.000Z');
  });

  it('con URLs locales (http) no envía auto_return ni notification_url', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173,http://localhost:80';
    process.env.BACKEND_PUBLIC_URL = '';
    const pref = servicio.construirPreferencia({ id: 1 }, []);
    assert.equal(pref.back_urls.success, 'http://localhost:5173/pago/resultado');
    assert.equal(pref.auto_return, undefined);
    assert.equal(pref.notification_url, undefined);
  });

  it('crearPreferencia envía el token y la clave de idempotencia; usa el checkout sandbox con TEST-', async () => {
    const r = await servicio.crearPreferencia({ id: 9 }, [{ productoId: 1, nombre: 'X', cantidad: 1, precioUnit: 10 }]);
    assert.equal(r.id, 'pref-123');
    assert.match(r.initPoint, /sandbox/);
    const [llamada] = mp.llamadas;
    assert.equal(llamada.headers.Authorization, 'Bearer TEST-token');
    assert.equal(llamada.headers['X-Idempotency-Key'], 'lecco-pedido-9');
  });

  it('mapearEstadoPago traduce los estados de MP', () => {
    assert.equal(servicio.mapearEstadoPago('approved'), 'aprobado');
    assert.equal(servicio.mapearEstadoPago('rejected'), 'rechazado');
    assert.equal(servicio.mapearEstadoPago('cancelled'), 'rechazado');
    assert.equal(servicio.mapearEstadoPago('refunded'), 'reembolsado');
    assert.equal(servicio.mapearEstadoPago('in_process'), 'pendiente');
  });

  it('verificarFirmaWebhook acepta firmas válidas y rechaza las alteradas', () => {
    assert.equal(servicio.verificarFirmaWebhook({ firma: firmar('123', 'req-1'), requestId: 'req-1', dataId: '123' }), true);
    assert.equal(servicio.verificarFirmaWebhook({ firma: firmar('123', 'req-1'), requestId: 'req-1', dataId: '124' }), false);
    assert.equal(servicio.verificarFirmaWebhook({ firma: 'basura', requestId: 'req-1', dataId: '123' }), false);
    process.env.MERCADOPAGO_WEBHOOK_SECRET = '';
    assert.equal(servicio.verificarFirmaWebhook({ firma: 'x', requestId: 'r', dataId: '1' }), null);
  });
});

// ── 2. Flujo con base de datos ──────────────────────────────────────────────
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const HOSTS_PERMITIDOS = ['localhost', '127.0.0.1', 'db', 'host.docker.internal'];
const urlSegura = (() => {
  if (!TEST_DATABASE_URL) return false;
  try { return HOSTS_PERMITIDOS.includes(new URL(TEST_DATABASE_URL).hostname); } catch { return false; }
})();

describe('Flujo de pago con Mercado Pago', { skip: !urlSegura && 'define TEST_DATABASE_URL (local)' }, () => {
  let server;
  let base;
  let prisma;
  let productoId;

  const pedir = async (metodo, ruta, { body, headers = {} } = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  const stock = async () => (await prisma.producto.findUnique({ where: { id: productoId } })).stock;
  const crearPedidoMP = () => pedir('POST', '/api/pedidos', {
    body: { items: [{ productoId, cantidad: 2 }], direccion: 'Av. Test 1', ciudad: 'Lima', metodoPago: 'mercadopago' }
  });
  const webhook = (pagoId, requestId = 'req-' + pagoId) => pedir('POST', `/api/webhooks/mercadopago?data.id=${pagoId}&type=payment`, {
    body: { type: 'payment', action: 'payment.updated', data: { id: String(pagoId) } },
    headers: { 'x-signature': firmar(String(pagoId), requestId), 'x-request-id': requestId }
  });

  before(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = 'secreto-solo-para-tests';
    process.env.NODE_ENV = 'test';
    process.env.RESEND_API_KEY = '';
    process.env.BREVO_API_KEY = '';

    const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npx prisma migrate deploy', { cwd: backendDir, env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: 'pipe' });

    prisma = (await import('../src/prisma.js')).default;
    const app = (await import('../src/app.js')).default;
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Campana","ItemPedido","Pedido","HistorialCambios","RefreshToken","PasswordResetToken","MensajeContacto","Producto","Usuario" RESTART IDENTITY CASCADE'
    );
    productoId = (await prisma.producto.create({ data: { nombre: 'Gafa MP', precio: '50.00', stock: 10, genero: 'unisex' } })).id;

    server = app.listen(0);
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(() => { mp.reset(); configurarMP(); });

  it('/metodos-pago informa si Mercado Pago está disponible', async () => {
    assert.deepEqual((await pedir('GET', '/api/pedidos/metodos-pago')).data, { whatsapp: true, mercadopago: true });
    process.env.MERCADOPAGO_ACCESS_TOKEN = '';
    assert.equal((await pedir('GET', '/api/pedidos/metodos-pago')).data.mercadopago, false);
  });

  it('pedido por WhatsApp no llama a Mercado Pago', async () => {
    const { status, data } = await pedir('POST', '/api/pedidos', { body: { items: [{ productoId, cantidad: 1 }] } });
    assert.equal(status, 201);
    assert.equal(data.pedido.metodoPago, 'whatsapp');
    assert.equal(data.initPoint, undefined);
    assert.equal(mp.llamadas.length, 0);
  });

  it('sin token, pedir Mercado Pago responde 503 y no crea el pedido', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = '';
    const antes = await stock();
    const { status } = await crearPedidoMP();
    assert.equal(status, 503);
    assert.equal(await stock(), antes);
  });

  it('crea la preferencia con el precio de BD y devuelve el initPoint', async () => {
    const { status, data } = await crearPedidoMP();
    assert.equal(status, 201);
    assert.match(data.initPoint, /pref_id=pref-123/);
    assert.equal(data.pedido.mpPreferenciaId, 'pref-123');
    const pref = mp.llamadas[0].body;
    assert.equal(pref.items[0].unit_price, 50);
    assert.equal(pref.external_reference, String(data.pedido.id));
  });

  it('si MP falla, responde 502, cancela el pedido y devuelve el stock', async () => {
    mp.caido = true;
    const antes = await stock();
    const { status } = await crearPedidoMP();
    assert.equal(status, 502);
    assert.equal(await stock(), antes);
    const ultimo = await prisma.pedido.findFirst({ orderBy: { id: 'desc' } });
    assert.equal(ultimo.estado, 'cancelado');
  });

  it('webhook con firma inválida responde 401', async () => {
    const { status } = await pedir('POST', '/api/webhooks/mercadopago?data.id=1&type=payment', {
      body: { type: 'payment', data: { id: '1' } },
      headers: { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'r' }
    });
    assert.equal(status, 401);
  });

  it('webhook de pago aprobado marca el pedido como pagado y en proceso; un rechazo posterior no lo pisa', async () => {
    const { data } = await crearPedidoMP();
    const pedidoId = data.pedido.id;
    mp.pagos['1001'] = { id: 1001, status: 'approved', external_reference: String(pedidoId), transaction_amount: 100, currency_id: 'PEN' };
    mp.pagos['1002'] = { id: 1002, status: 'rejected', external_reference: String(pedidoId), transaction_amount: 100, currency_id: 'PEN' };

    assert.equal((await webhook(1001)).status, 200);
    let pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    assert.equal(pedido.estadoPago, 'aprobado');
    assert.equal(pedido.estado, 'procesando');
    assert.equal(pedido.mpPagoId, '1001');

    await webhook(1002);
    pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    assert.equal(pedido.estadoPago, 'aprobado');
  });

  it('un importe menor al total deja el pago en revisión', async () => {
    const { data } = await crearPedidoMP();
    mp.pagos['2001'] = { id: 2001, status: 'approved', external_reference: String(data.pedido.id), transaction_amount: 1, currency_id: 'PEN' };
    await webhook(2001);
    const pedido = await prisma.pedido.findUnique({ where: { id: data.pedido.id } });
    assert.equal(pedido.estadoPago, 'revision');
    assert.equal(pedido.estado, 'pendiente');
  });

  it('/pago/confirmar sincroniza el pago al volver del checkout', async () => {
    const { data } = await crearPedidoMP();
    mp.pagos['3001'] = { id: 3001, status: 'in_process', external_reference: String(data.pedido.id), transaction_amount: 100 };
    const r = await pedir('POST', '/api/pedidos/pago/confirmar', { body: { pagoId: '3001' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data, { pedidoId: data.pedido.id, estadoPago: 'pendiente', estado: 'pendiente' });

    assert.equal((await pedir('POST', '/api/pedidos/pago/confirmar', { body: { pagoId: 'abc' } })).status, 400);
    assert.equal((await pedir('POST', '/api/pedidos/pago/confirmar', { body: { pagoId: '9999' } })).status, 502);
  });
});
