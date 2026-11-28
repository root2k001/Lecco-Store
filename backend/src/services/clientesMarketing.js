import prisma from '../prisma.js';
import { brevoHabilitado, sincronizarContacto, registrarEvento } from './brevoService.js';

/**
 * Recalcula las estadísticas de compra de un cliente (sin pedidos cancelados)
 * y las envía a Brevo. Nunca lanza: pensado para llamarse sin `await`.
 */
export const sincronizarCliente = async (usuarioId, extra = {}) => {
  if (!brevoHabilitado() || !usuarioId) return;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true, nombre: true }
    });
    if (!usuario) return;

    const filtro = { usuarioId, estado: { not: 'cancelado' } };
    const [resumen, ultimo] = await Promise.all([
      prisma.pedido.aggregate({ where: filtro, _count: { _all: true }, _sum: { total: true } }),
      prisma.pedido.findFirst({ where: filtro, orderBy: { creadoEn: 'desc' }, select: { creadoEn: true } })
    ]);

    await sincronizarContacto({
      email: usuario.email,
      nombre: usuario.nombre,
      estadisticas: {
        numPedidos: resumen._count._all,
        totalGastado: Number(resumen._sum.total ?? 0),
        ultimaCompra: ultimo?.creadoEn
      },
      ...extra
    });
  } catch (err) {
    console.warn('[Brevo] No se pudo sincronizar el cliente:', err.message);
  }
};

/**
 * Tras crear un pedido de un cliente registrado: actualiza sus estadísticas y
 * envía el evento "pedido_creado" (dispara automatizaciones post-compra).
 * Los pedidos de invitados no tienen email, así que no se sincronizan.
 */
export const notificarPedidoCreado = async (pedido) => {
  if (!brevoHabilitado() || !pedido?.usuarioId) return;
  try {
    await sincronizarCliente(pedido.usuarioId);
    const usuario = await prisma.usuario.findUnique({
      where: { id: pedido.usuarioId },
      select: { email: true }
    });
    if (!usuario) return;
    await registrarEvento(usuario.email, 'pedido_creado', {
      pedido_id: pedido.id,
      total: Number(pedido.total),
      num_productos: pedido.items?.reduce((suma, i) => suma + i.cantidad, 0) ?? 0,
      ...(pedido.origenCampana ? { campana: pedido.origenCampana } : {})
    });
  } catch (err) {
    console.warn('[Brevo] No se pudo notificar el pedido:', err.message);
  }
};
