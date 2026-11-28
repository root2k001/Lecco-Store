/**
 * Integración con Mercado Pago (Checkout Pro) vía API REST.
 * No depende de la base de datos: solo construye/envía peticiones a la API.
 *
 * Variables de entorno:
 *   MERCADOPAGO_ACCESS_TOKEN   Access token (TEST-... en pruebas, APP_USR-... en producción)
 *   MERCADOPAGO_WEBHOOK_SECRET Clave secreta de la firma de notificaciones (panel de MP → Webhooks)
 *   BACKEND_PUBLIC_URL         URL pública del backend (https) para recibir el webhook
 *   FRONTEND_URL               El primer origen se usa para las back_urls de retorno
 */
import crypto from 'crypto';

const API_MP = 'https://api.mercadopago.com';
const MONEDA = 'PEN';
const HORAS_EXPIRACION = 24;

export const mercadoPagoHabilitado = () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

const urlBase = (valor) => (valor || '').split(',')[0].trim().replace(/\/$/, '');

const llamarApi = async (metodo, ruta, { body, idempotencia } = {}) => {
  const res = await fetch(API_MP + ruta, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detalle = data?.message || data?.error || res.statusText;
    throw new Error(`Mercado Pago respondió ${res.status}: ${detalle}`);
  }
  return data;
};

/**
 * Construye el cuerpo de la preferencia. Los precios vienen SIEMPRE de la BD.
 * @param {{ id: number }} pedido
 * @param {{ productoId: number, nombre: string, cantidad: number, precioUnit: any }[]} lineas
 */
export const construirPreferencia = (pedido, lineas, ahora = new Date()) => {
  const frontend = urlBase(process.env.FRONTEND_URL) || 'http://localhost:5173';
  const backend = urlBase(process.env.BACKEND_PUBLIC_URL);
  const retorno = `${frontend}/pago/resultado`;

  const preferencia = {
    items: lineas.map(l => ({
      id: String(l.productoId),
      title: String(l.nombre).slice(0, 250),
      quantity: l.cantidad,
      unit_price: Number(l.precioUnit),
      currency_id: MONEDA
    })),
    external_reference: String(pedido.id),
    metadata: { pedido_id: pedido.id },
    back_urls: { success: retorno, failure: retorno, pending: retorno },
    statement_descriptor: 'LECCO STORE',
    // Si el cliente no paga en 24 h la preferencia deja de aceptar pagos
    expires: true,
    expiration_date_from: ahora.toISOString(),
    expiration_date_to: new Date(ahora.getTime() + HORAS_EXPIRACION * 3600 * 1000).toISOString()
  };

  // MP rechaza auto_return con back_urls que no sean https (p. ej. localhost)
  if (retorno.startsWith('https://')) preferencia.auto_return = 'approved';
  // El webhook solo es alcanzable con una URL pública https
  if (backend.startsWith('https://')) preferencia.notification_url = `${backend}/api/webhooks/mercadopago`;

  return preferencia;
};

/** Crea la preferencia de Checkout Pro y devuelve { id, initPoint }. */
export const crearPreferencia = async (pedido, lineas) => {
  const data = await llamarApi('POST', '/checkout/preferences', {
    body: construirPreferencia(pedido, lineas),
    idempotencia: `lecco-pedido-${pedido.id}`
  });
  // Con credenciales TEST-... se usa el checkout de pruebas
  const esPrueba = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-');
  return { id: data.id, initPoint: (esPrueba && data.sandbox_init_point) || data.init_point };
};

/** Consulta un pago en Mercado Pago (fuente de verdad del estado). */
export const obtenerPago = (pagoId) => llamarApi('GET', `/v1/payments/${encodeURIComponent(pagoId)}`);

/** Traduce el estado de MP al estado de pago interno. */
export const mapearEstadoPago = (status) => {
  switch (status) {
    case 'approved': return 'aprobado';
    case 'rejected':
    case 'cancelled': return 'rechazado';
    case 'refunded':
    case 'charged_back': return 'reembolsado';
    default: return 'pendiente'; // pending, in_process, authorized, in_mediation
  }
};

/**
 * Verifica la cabecera x-signature de una notificación de Mercado Pago.
 * Manifest: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" firmado con HMAC-SHA256.
 * Sin MERCADOPAGO_WEBHOOK_SECRET configurado devuelve null (no se puede verificar).
 */
export const verificarFirmaWebhook = ({ firma, requestId, dataId }) => {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) return null;
  if (!firma || !dataId) return false;

  const partes = Object.fromEntries(
    String(firma).split(',').map(p => p.split('=').map(s => s.trim()))
  );
  if (!partes.ts || !partes.v1) return false;

  // MP indica usar el id en minúsculas si es alfanumérico
  const id = /^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : String(dataId);
  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${partes.ts};`;

  const esperado = crypto.createHmac('sha256', secreto).update(manifest).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(partes.v1));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
