import prisma from '../prisma.js';
import { obtenerPago, mapearEstadoPago } from './mercadoPagoService.js';

/**
 * Sincroniza un pago de Mercado Pago con su pedido. Idempotente: se puede
 * llamar desde el webhook y desde la página de retorno sin efectos duplicados.
 * El estado SIEMPRE se lee de la API de MP (nunca de lo que envía el cliente).
 * @returns {Promise<{ pedidoId: number, estadoPago: string, estado: string } | null>}
 */
export const sincronizarPagoMercadoPago = async (pagoId) => {
  const pago = await obtenerPago(pagoId);
  const pedidoId = Number.parseInt(pago?.external_reference, 10);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) return null;

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido || pedido.metodoPago !== 'mercadopago') return null;

  const idPago = String(pago.id);
  const resultado = { pedidoId, estadoPago: pedido.estadoPago, estado: pedido.estado };

  // Un pedido puede tener varios intentos: un intento posterior fallido no pisa uno aprobado
  if (pedido.estadoPago === 'aprobado' && pedido.mpPagoId && pedido.mpPagoId !== idPago) {
    return resultado;
  }

  let estadoPago = mapearEstadoPago(pago.status);

  // Defensa extra: el importe cobrado debe cubrir el total del pedido
  if (estadoPago === 'aprobado') {
    const montoOk = Number(pago.transaction_amount) + 0.009 >= Number(pedido.total);
    const monedaOk = !pago.currency_id || pago.currency_id === 'PEN';
    if (!montoOk || !monedaOk) {
      console.error(`[MercadoPago] Pago ${idPago} del pedido #${pedidoId} no coincide con el total (${pago.transaction_amount} ${pago.currency_id} vs ${pedido.total}).`);
      estadoPago = 'revision';
    }
  }

  const data = { estadoPago, mpPagoId: idPago };
  // Pago confirmado → el pedido pasa a preparación
  if (estadoPago === 'aprobado' && pedido.estado === 'pendiente') data.estado = 'procesando';

  if (data.estadoPago !== pedido.estadoPago || idPago !== pedido.mpPagoId || data.estado) {
    await prisma.pedido.update({ where: { id: pedidoId }, data });
  }

  return { pedidoId, estadoPago, estado: data.estado || pedido.estado };
};
