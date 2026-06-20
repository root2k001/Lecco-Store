import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';
import nodemailer from 'nodemailer';
import dns from 'dns';

const router = Router();

// Helper para crear el transporte de nodemailer
const crearTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    family: 4,
    lookup: (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback)
  });
};

// Mapa de estados para el email
const estadoLabels = {
  pendiente:   { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  procesando:  { label: 'En Proceso', color: '#2563eb', bg: '#dbeafe' },
  enviado:     { label: 'Enviado 🚀', color: '#db2777', bg: '#fce7f3' },
  entregado:   { label: 'Entregado ✅', color: '#059669', bg: '#d1fae5' }
};

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
      include: {
        usuario: { select: { nombre: true, email: true } },
        items: { include: { producto: { select: { nombre: true, precio: true } } } }
      }
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

    // ─── Enviar email de notificación al cliente ───────────────────────────────
    const transporter = crearTransporter();
    if (transporter && pedidoPrevio.usuario?.email) {
      const estadoInfo = estadoLabels[estado] || { label: estado, color: '#475569', bg: '#f1f5f9' };
      const clienteEmail = pedidoPrevio.usuario.email;
      const clienteNombre = pedidoPrevio.usuario.nombre || 'Cliente';
      const itemsHtml = pedidoPrevio.items.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${item.producto?.nombre || 'Producto'}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155; text-align: right;">S/ ${Number(item.precioUnit).toFixed(2)}</td>
        </tr>
      `).join('');

      transporter.sendMail({
        from: `"Lecco Store" <${process.env.SMTP_USER}>`,
        to: clienteEmail,
        subject: `📦 Actualización de tu pedido #${id} — ${estadoInfo.label}`,
        html: `
          <div style="font-family: 'DM Sans', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #111827; padding: 28px 32px;">
              <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LECCO</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Store</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 20px; font-weight: 600;">Hola, ${clienteNombre} 👋</h2>
              <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                Te informamos que el estado de tu pedido <strong>#${id}</strong> ha sido actualizado.
              </p>

              <div style="background: ${estadoInfo.bg}; border-radius: 8px; padding: 16px 20px; display: inline-block; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Estado actual</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${estadoInfo.color};">${estadoInfo.label}</p>
              </div>

              <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; margin: 0 0 12px; text-transform: uppercase;">Productos de tu pedido</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr>
                    <th style="padding: 8px 0; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9;">Producto</th>
                    <th style="padding: 8px 0; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9;">Cant.</th>
                    <th style="padding: 8px 0; text-align: right; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9;">Precio</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>

              <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">📍 <strong>Dirección de envío:</strong></p>
                <p style="margin: 0; color: #334155; font-size: 14px;">${pedidoPrevio.direccion || ''}, ${pedidoPrevio.ciudad || ''}</p>
              </div>

              <div style="border-top: 2px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total</span>
                <span style="color: #1e293b; font-size: 18px; font-weight: 700;">S/ ${Number(pedidoPrevio.total).toFixed(2)}</span>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">Si tienes alguna pregunta, contáctanos en <a href="mailto:${process.env.ADMIN_EMAIL}" style="color: #c9a962;">${process.env.ADMIN_EMAIL}</a></p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} Lecco Store. Todos los derechos reservados.</p>
            </div>
          </div>
        `
      }).catch(err => console.error('Error enviando email de estado al cliente:', err));
    }
    // ──────────────────────────────────────────────────────────────────────────

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({ error: 'Hubo un error al actualizar el estado del pedido' });
  }
});

export default router;
