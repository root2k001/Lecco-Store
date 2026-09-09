import { Router } from 'express';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin, optionalToken } from '../middlewares/authMiddleware.js';
import { Resend } from 'resend';

const router = Router();

// Helper para escapar caracteres HTML especiales en emails
const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Helper Resend — usa API HTTP, no SMTP (funciona sin restricciones en Render)
const crearResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

// Mapa de estados para el email
const estadoLabels = {
  pendiente:   { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  procesando:  { label: 'En Proceso', color: '#2563eb', bg: '#dbeafe' },
  enviado:     { label: 'Enviado 🚀', color: '#db2777', bg: '#fce7f3' },
  entregado:   { label: 'Entregado ✅', color: '#059669', bg: '#d1fae5' }
};

// Crear un nuevo pedido (Opción A: acepta invitados sin cuenta)
router.post('/', optionalToken, async (req, res) => {
  // Si el usuario está logueado, tendrá su ID. Si es invitado, será null.
  const usuarioId = req.usuario ? req.usuario.id : null;
  const { items, direccion, ciudad, codigoPostal, telefono } = req.body;
  // 'items' debe ser un arreglo: [{ productoId: 1, cantidad: 2 }]
  // El precio y total se calculan desde la base de datos (NUNCA del frontend)

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe contener al menos un producto.' });
  }

  try {
    // Todo dentro de una transacción para evitar race conditions (TOCTOU)
    const nuevoPedido = await prisma.$transaction(async (tx) => {
      let totalCalculado = 0;
      const itemsParaCrear = [];

      for (const item of items) {
        // 1. Obtener el producto con su precio REAL desde la BD
        const producto = await tx.producto.findUnique({
          where: { id: item.productoId }
        });

        if (!producto) {
          throw new Error(`VALIDATION:Producto con ID #${item.productoId} no encontrado.`);
        }

        // 2. Verificar stock DENTRO de la transacción (elimina race condition)
        if (producto.stock < item.cantidad) {
          throw new Error(`VALIDATION:Stock insuficiente para "${producto.nombre}". Stock disponible: ${producto.stock}.`);
        }

        // 3. Usar el precio de la BD, NUNCA el del frontend (previene price tampering)
        itemsParaCrear.push({
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnit: producto.precio
        });

        totalCalculado += producto.precio * item.cantidad;

        // 4. Decrementar stock atómicamente dentro de la transacción
        await tx.producto.update({
          where: { id: producto.id },
          data: { stock: { decrement: item.cantidad } }
        });
      }

      // 5. Crear el pedido con el total calculado por el servidor
      const pedido = await tx.pedido.create({
        data: {
          usuarioId,
          total: totalCalculado,
          direccion,
          ciudad,
          codigoPostal,
          telefono,
          items: { create: itemsParaCrear }
        },
        include: { items: true }
      });

      return pedido;
    });

    res.status(201).json({ message: 'Pedido procesado exitosamente', pedido: nuevoPedido });
  } catch (error) {
    console.error('Error creando pedido:', error);

    // Errores de validación de negocio (lanzados con throw new Error('VALIDATION:...'))
    if (error.message?.startsWith('VALIDATION:')) {
      return res.status(400).json({ error: error.message.replace('VALIDATION:', '') });
    }

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
  const { estado, motivo } = req.body;

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

    const transacciones = [];

    // Manejar el stock si cambia el estado respecto a "cancelado"
    if (pedidoPrevio.estado !== 'cancelado' && estado === 'cancelado') {
      // Se cancela: regresar el stock
      for (const item of pedidoPrevio.items) {
        transacciones.push(
          prisma.producto.update({
            where: { id: item.productoId },
            data: { stock: { increment: item.cantidad } }
          })
        );
      }
    } else if (pedidoPrevio.estado === 'cancelado' && estado !== 'cancelado') {
      // Se "descancela": volver a descontar el stock
      for (const item of pedidoPrevio.items) {
        transacciones.push(
          prisma.producto.update({
            where: { id: item.productoId },
            data: { stock: { decrement: item.cantidad } }
          })
        );
      }
    }

    // Actualizar el pedido
    transacciones.push(
      prisma.pedido.update({
        where: { id: parseInt(id) },
        data: { estado }
      })
    );

    // Ejecutar todas las transacciones atómicamente
    await prisma.$transaction(transacciones);
    
    // Obtenemos el pedido actualizado de la bd o asumimos sus valores previos para continuar
    const pedidoActualizado = { ...pedidoPrevio, estado };
    // Preparar el detalle del historial
    let detalleHistorial = `Pedido #${id} del cliente "${pedidoPrevio.usuario?.nombre || 'Invitado'}": estado modificado de "${pedidoPrevio.estado}" a "${estado}".`;
    if (estado === 'cancelado' && motivo) {
      detalleHistorial += ` Motivo: ${motivo}`;
    }

    // Registrar en el historial
    await prisma.historialCambios.create({
      data: {
        adminId: req.usuario.id,
        accion: estado === 'cancelado' ? 'Cancelación de Pedido' : 'Cambio de Estado de Pedido',
        detalle: detalleHistorial
      }
    });

    // ─── Enviar email de notificación al cliente con Resend ───────────────────
    const resend = crearResend();
    if (resend && pedidoPrevio.usuario?.email) {
      const estadoInfo = estadoLabels[estado] || { label: estado, color: '#475569', bg: '#f1f5f9' };
      const clienteEmail = pedidoPrevio.usuario.email;
      const clienteNombre = pedidoPrevio.usuario.nombre || 'Cliente';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lecco Store <onboarding@resend.dev>';
      const itemsHtml = pedidoPrevio.items.map(item => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${item.producto?.nombre || 'Producto'}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #334155; text-align: right;">S/ ${Number(item.precioUnit).toFixed(2)}</td>
        </tr>
      `).join('');

      resend.emails.send({
        from: fromEmail,
        to: clienteEmail,
        subject: `📦 Actualización de tu pedido #${id} — ${estadoInfo.label}`,
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #111827; padding: 28px 32px;">
              <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LECCO</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Store</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 20px; font-weight: 600;">Hola, ${escapeHtml(clienteNombre)} 👋</h2>
              <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                Te informamos que el estado de tu pedido <strong>#${id}</strong> ha sido actualizado.
              </p>
              <div style="background: ${estadoInfo.bg}; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Estado actual</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${estadoInfo.color};">${estadoInfo.label}</p>
              </div>
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; margin: 0 0 12px; text-transform: uppercase;">Productos de tu pedido</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr>
                    <th style="padding: 8px 0; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Producto</th>
                    <th style="padding: 8px 0; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Cant.</th>
                    <th style="padding: 8px 0; text-align: right; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Precio</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 13px; color: #64748b;">📍 <strong>Dirección de envío:</strong></p>
                <p style="margin: 0; color: #334155; font-size: 14px;">${escapeHtml(pedidoPrevio.direccion || '')}, ${escapeHtml(pedidoPrevio.ciudad || '')}</p>
              </div>
              <div style="border-top: 2px solid #f1f5f9; padding-top: 16px;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase;">Total: </span>
                <span style="color: #1e293b; font-size: 18px; font-weight: 700;">S/ ${Number(pedidoPrevio.total).toFixed(2)}</span>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} Lecco Store. Todos los derechos reservados.</p>
            </div>
          </div>
        `
      }).catch(err => console.error('Error enviando email de estado al cliente con Resend:', err));
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({ error: 'Hubo un error al actualizar el estado del pedido' });
  }
});

export default router;
