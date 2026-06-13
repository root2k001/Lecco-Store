import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Crear un nuevo pedido (Ruta protegida)
router.post('/', verifyToken, async (req, res) => {
  const usuarioId = req.usuario.id;
  const { items, total, direccion, ciudad, codigoPostal, telefono } = req.body;
  // 'items' debe ser un arreglo que llegue del Frontend como: [{ productoId: 1, cantidad: 2, precio: 150 }]

  try {
    // 1. Verificar stock disponible para todos los productos antes de crear el pedido
    for (const item of items) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId }
      });
      if (!producto) {
        return res.status(404).json({ error: `Producto con ID #${item.productoId} no encontrado.` });
      }
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.stock}.` });
      }
    }

    // 2. Realizar la compra y descontar stock en una transacción
    const nuevoPedido = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          usuarioId,
          total,
          direccion,
          ciudad,
          codigoPostal,
          telefono,
          items: {
            create: items.map(item => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnit: item.precio
            }))
          }
        },
        include: {
          items: true
        }
      });

      // Descontar stock para cada producto
      for (const item of items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: {
            stock: {
              decrement: item.cantidad
            }
          }
        });
      }

      return pedido;
    });

    res.status(201).json({ message: 'Pedido procesado exitosamente', pedido: nuevoPedido });
  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Hubo un error al procesar el pedido' });
  }
});

// Obtener el historial de pedidos del usuario autenticado
router.get('/mis-pedidos', verifyToken, async (req, res) => {
  const usuarioId = req.usuario.id;

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
    const pedidoPrevio = await prisma.pedido.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { select: { nombre: true } } }
    });

    if (!pedidoPrevio) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedidoActualizado = await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: { estado }
    });

    // Registrar en el historial
    await prisma.historialCambios.create({
      data: {
        adminId: req.usuario.id,
        accion: 'Cambio de Estado de Pedido',
        detalle: `Pedido #${id} del cliente "${pedidoPrevio.usuario?.nombre || 'Desconocido'}": estado modificado de "${pedidoPrevio.estado}" a "${estado}".`
      }
    });

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({ error: 'Hubo un error al actualizar el estado del pedido' });
  }
});

export default router;
