import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/stats — Métricas agregadas para el dashboard admin
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Fecha de inicio del día actual (00:00:00)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Ejecutar todas las consultas en paralelo
    const [
      pedidosAgrupados,
      ingresos,
      pedidosHoy,
      productosTotal,
      productosBajoStock,
      clientesTotal,
      mensajesTotal,
      ventasCampanas
    ] = await Promise.all([
      // Conteo de pedidos por estado (agregado en la BD, sin traer todas las filas)
      prisma.pedido.groupBy({
        by: ['estado'],
        _count: { _all: true }
      }),
      // Ingresos: suma de totales excluyendo pedidos cancelados
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { estado: { not: 'cancelado' } }
      }),
      // Pedidos creados hoy
      prisma.pedido.count({
        where: { creadoEn: { gte: hoy } }
      }),
      // Total de productos
      prisma.producto.count(),
      // Productos con stock <= 5
      prisma.producto.findMany({
        where: { stock: { lte: 5 } },
        select: { id: true, nombre: true, stock: true }
      }),
      // Total de clientes (rol = 'cliente')
      prisma.usuario.count({
        where: { rol: 'cliente' }
      }),
      // Total de mensajes de contacto
      prisma.mensajeContacto.count(),
      // Ventas atribuidas a cada campaña (UTM), sin pedidos cancelados
      prisma.pedido.groupBy({
        by: ['origenCampana'],
        where: { origenCampana: { not: null }, estado: { not: 'cancelado' } },
        _count: { _all: true },
        _sum: { total: true }
      })
    ]);

    // Ingresos totales (los pedidos cancelados no suman)
    const ingresosTotales = Number(ingresos._sum.total ?? 0);

    // Contar pedidos por estado
    const pedidosPorEstado = {
      pendiente: 0,
      procesando: 0,
      enviado: 0,
      entregado: 0,
      cancelado: 0
    };
    let totalPedidos = 0;
    pedidosAgrupados.forEach(g => {
      totalPedidos += g._count._all;
      if (pedidosPorEstado[g.estado] !== undefined) {
        pedidosPorEstado[g.estado] = g._count._all;
      }
    });

    res.json({
      ingresosTotales,
      totalPedidos,
      pedidosHoy,
      pedidosPorEstado,
      totalProductos: productosTotal,
      productosBajoStock,
      totalClientes: clientesTotal,
      totalMensajes: mensajesTotal,
      ventasPorCampana: ventasCampanas
        .map(v => ({ campana: v.origenCampana, pedidos: v._count._all, ingresos: Number(v._sum.total ?? 0) }))
        .sort((a, b) => b.ingresos - a.ingresos)
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas del dashboard' });
  }
});

export default router;
