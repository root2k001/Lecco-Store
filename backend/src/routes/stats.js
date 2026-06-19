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
      pedidosTodos,
      pedidosHoy,
      productosTotal,
      productosBajoStock,
      clientesTotal,
      mensajesTotal
    ] = await Promise.all([
      // Todos los pedidos con su total
      prisma.pedido.findMany({
        select: { total: true, estado: true }
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
      prisma.mensajeContacto.count()
    ]);

    // Calcular ingresos totales
    const ingresosTotales = pedidosTodos.reduce((sum, p) => sum + Number(p.total), 0);

    // Contar pedidos por estado
    const pedidosPorEstado = {
      pendiente: 0,
      procesando: 0,
      enviado: 0,
      entregado: 0
    };
    pedidosTodos.forEach(p => {
      if (pedidosPorEstado[p.estado] !== undefined) {
        pedidosPorEstado[p.estado]++;
      }
    });

    res.json({
      ingresosTotales,
      totalPedidos: pedidosTodos.length,
      pedidosHoy,
      pedidosPorEstado,
      totalProductos: productosTotal,
      productosBajoStock,
      totalClientes: clientesTotal,
      totalMensajes: mensajesTotal
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener las estadísticas del dashboard' });
  }
});

export default router;
