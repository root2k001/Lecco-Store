import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Crear un nuevo pedido
router.post('/', async (req, res) => {
  const { usuarioId, items, total, direccion, ciudad, codigoPostal, telefono } = req.body;
  // 'items' debe ser un arreglo que llegue del Frontend como: [{ productoId: 1, cantidad: 2, precio: 150 }]

  try {
    const nuevoPedido = await prisma.pedido.create({
      data: {
        usuarioId,
        total,
        direccion,
        ciudad,
        codigoPostal,
        telefono,
        // Prisma es genial y nos permite crear el pedido y sus items al mismo tiempo:
        items: {
          create: items.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnit: item.precio
          }))
        }
      },
      include: {
        items: true // Para devolver los detalles en la respuesta
      }
    });

    res.status(201).json({ message: 'Pedido procesado exitosamente', pedido: nuevoPedido });
  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Hubo un error al procesar el pedido' });
  }
});

// Obtener el historial de pedidos de un usuario específico
router.get('/mis-pedidos/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const pedidos = await prisma.pedido.findMany({
      where: { usuarioId: parseInt(usuarioId) },
      include: {
        items: {
          include: {
            producto: true // Queremos saber el nombre e imagen del producto comprado, no solo su ID
          }
        }
      },
      orderBy: { creadoEn: 'desc' } // Los más recientes primero
    });

    res.json(pedidos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un error al obtener el historial de pedidos' });
  }
});

// Rutas de Administrador

// Obtener TODOS los pedidos de la tienda
router.get('/admin/todos', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { nombre: true, email: true } },
        items: {
          include: { producto: { select: { nombre: true, precio: true } } }
        }
      }
    });
    res.json(pedidos);
  } catch (error) {
    console.error('Error obteniendo todos los pedidos:', error);
    res.status(500).json({ error: 'Hubo un error al obtener los pedidos globales' });
  }
});

// Actualizar el estado de un pedido (ej. pendiente -> enviado)
router.put('/admin/estado/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const pedidoActualizado = await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: { estado }
    });
    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({ error: 'Hubo un error al actualizar el estado del pedido' });
  }
});

export default router;
