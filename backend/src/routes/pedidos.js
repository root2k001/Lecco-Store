import { Router } from 'express';
import pkg from '@prisma/client';
import prisma from '../prisma.js';
import { verifyToken, verifyAdmin, optionalToken } from '../middlewares/authMiddleware.js';
import { crearPedidoSchema, actualizarEstadoPedidoSchema, confirmarPagoSchema } from '../validators/pedidos.js';
import { mercadoPagoHabilitado, crearPreferencia } from '../services/mercadoPagoService.js';
import { sincronizarPagoMercadoPago } from '../services/pagosPedido.js';
import { parseId } from '../validators/params.js';
import { enviarEmail } from '../services/emailService.js';
import { plantillaEstadoPedido } from '../services/emailTemplates.js';
import rateLimit from 'express-rate-limit';
import { notificarPedidoCreado, sincronizarCliente } from '../services/clientesMarketing.js';

const { Prisma } = pkg;

const router = Router();

// Limita la creación de pedidos (acepta invitados y descuenta stock al instante)
const crearPedidoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Demasiados pedidos en poco tiempo. Intenta de nuevo más tarde.' }
});

// Consultas de estado al volver de Mercado Pago
const confirmarPagoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas consultas de pago. Intenta de nuevo más tarde.' }
});

// Devuelve el pedido a su estado previo si no se pudo generar el pago (libera el stock)
const anularPedidoSinPago = (pedido) => prisma.$transaction(async (tx) => {
  for (const item of pedido.items) {
    await tx.producto.update({
      where: { id: item.productoId },
      data: { stock: { increment: item.cantidad } }
    });
  }
  await tx.pedido.update({
    where: { id: pedido.id },
    data: { estado: 'cancelado', estadoPago: 'rechazado' }
  });
});

// Mapa de estados para el email
const estadoLabels = {
  pendiente: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  procesando: { label: 'En Proceso', color: '#2563eb', bg: '#dbeafe' },
  enviado: { label: 'Enviado ', color: '#db2777', bg: '#fce7f3' },
  entregado: { label: 'Entregado ', color: '#059669', bg: '#d1fae5' }
};

// Crear un nuevo pedido (Opción A: acepta invitados sin cuenta)
router.post('/', crearPedidoLimiter, optionalToken, async (req, res) => {
  // Si el usuario está logueado, tendrá su ID. Si es invitado, será null.
  const usuarioId = req.usuario ? req.usuario.id : null;
  const validacion = crearPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'Datos de pedido inválidos' });
  }
  const { items, direccion, ciudad, codigoPostal, telefono, origenCampana, metodoPago } = validacion.data;
  // 'items' debe ser un arreglo: [{ productoId: 1, cantidad: 2 }]
  // El precio y total se calculan desde la base de datos (NUNCA del frontend)

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe contener al menos un producto.' });
  }

  if (metodoPago === 'mercadopago' && !mercadoPagoHabilitado()) {
    return res.status(503).json({ error: 'El pago con Mercado Pago no está disponible en este momento. Puedes finalizar tu pedido por WhatsApp.' });
  }

  // Nombres y precios de BD para el detalle de la preferencia de Mercado Pago
  let lineasPago = [];

  try {
    // Todo dentro de una transacción para evitar race conditions (TOCTOU)
    let nuevoPedido = await prisma.$transaction(async (tx) => {
      // Decimal de Prisma: evita errores de coma flotante al sumar importes
      let totalCalculado = new Prisma.Decimal(0);
      const itemsParaCrear = [];
      lineasPago = [];

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
          precioUnit: producto.precio,
          color: producto.color // copia del color al momento de la compra
        });
        lineasPago.push({ productoId: producto.id, nombre: producto.nombre, cantidad: item.cantidad, precioUnit: producto.precio });

        totalCalculado = totalCalculado.add(producto.precio.mul(item.cantidad));

        // 4. Decrementar stock de forma atómica: solo si sigue habiendo stock suficiente.
        //    Evita stock negativo cuando dos pedidos concurrentes pasan la verificación del paso 2.
        const { count } = await tx.producto.updateMany({
          where: { id: producto.id, stock: { gte: item.cantidad } },
          data: { stock: { decrement: item.cantidad } }
        });
        if (count === 0) {
          throw new Error(`VALIDATION:Stock insuficiente para "${producto.nombre}".`);
        }
      }

      // 5. Crear el pedido con el total calculado por el servidor
      const pedidoData = {
        total: totalCalculado,
        direccion,
        ciudad,
        codigoPostal,
        telefono,
        metodoPago,
        items: { create: itemsParaCrear }
      };

      // Atribución: solo se guarda si la campaña existe (evita valores basura en las métricas)
      if (origenCampana) {
        const campana = await tx.campana.findUnique({ where: { slug: origenCampana }, select: { slug: true } });
        if (campana) pedidoData.origenCampana = campana.slug;
      }

      // Solo vincular usuario si está logueado (invitados no tienen usuarioId)
      if (usuarioId) {
        pedidoData.usuario = { connect: { id: usuarioId } };
      }

      const pedido = await tx.pedido.create({
        data: pedidoData,
        include: { items: true }
      });

      return pedido;
    });

    // Mercado Pago: se genera el checkout con los precios de la BD
    let initPoint;
    if (metodoPago === 'mercadopago') {
      try {
        const preferencia = await crearPreferencia(nuevoPedido, lineasPago);
        nuevoPedido = await prisma.pedido.update({
          where: { id: nuevoPedido.id },
          data: { mpPreferenciaId: preferencia.id },
          include: { items: true }
        });
        initPoint = preferencia.initPoint;
      } catch (error) {
        console.error(`Error creando preferencia de Mercado Pago (pedido #${nuevoPedido.id}):`, error);
        await anularPedidoSinPago(nuevoPedido).catch(e => console.error('Error anulando pedido sin pago:', e));
        return res.status(502).json({ error: 'No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo o finaliza tu pedido por WhatsApp.' });
      }
    }

    res.status(201).json({ message: 'Pedido procesado exitosamente', pedido: nuevoPedido, ...(initPoint ? { initPoint } : {}) });

    // Brevo (fire-and-forget, después de responder): estadísticas del cliente y evento post-compra
    notificarPedidoCreado(nuevoPedido);
  } catch (error) {
    console.error('Error creando pedido:', error);

    // Errores de validación de negocio (lanzados con throw new Error('VALIDATION:...'))
    if (error.message?.startsWith('VALIDATION:')) {
      return res.status(400).json({ error: error.message.replace('VALIDATION:', '') });
    }

    res.status(500).json({ error: 'Hubo un error al procesar el pedido' });
  }
});

// Métodos de pago disponibles (el frontend oculta Mercado Pago si no está configurado)
router.get('/metodos-pago', (req, res) => {
  res.json({ whatsapp: true, mercadopago: mercadoPagoHabilitado() });
});

// Retorno desde Mercado Pago: consulta el pago en MP y actualiza el pedido (respaldo del webhook)
router.post('/pago/confirmar', confirmarPagoLimiter, async (req, res) => {
  if (!mercadoPagoHabilitado()) {
    return res.status(503).json({ error: 'Mercado Pago no está configurado.' });
  }
  const validacion = confirmarPagoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'ID de pago inválido.' });
  }

  try {
    const resultado = await sincronizarPagoMercadoPago(validacion.data.pagoId);
    if (!resultado) {
      return res.status(404).json({ error: 'No se encontró un pedido asociado a este pago.' });
    }
    res.json(resultado);
  } catch (error) {
    console.error('Error confirmando pago de Mercado Pago:', error);
    res.status(502).json({ error: 'No se pudo verificar el pago con Mercado Pago.' });
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
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'ID de pedido inválido' });
  }
  const validacion = actualizarEstadoPedidoSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'Datos de estado no válidos' });
  }
  const { estado, motivo } = validacion.data;

  try {
    const pedidoPrevio = await prisma.pedido.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombre: true, email: true } },
        items: { include: { producto: { select: { nombre: true, precio: true } } } }
      }
    });

    if (!pedidoPrevio) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Ejecutar los cambios de stock y estado atómicamente
    await prisma.$transaction(async (tx) => {
      // Manejar el stock si cambia el estado respecto a "cancelado"
      if (pedidoPrevio.estado !== 'cancelado' && estado === 'cancelado') {
        // Se cancela: regresar el stock
        for (const item of pedidoPrevio.items) {
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: { increment: item.cantidad } }
          });
        }
      } else if (pedidoPrevio.estado === 'cancelado' && estado !== 'cancelado') {
        // Se "descancela": volver a descontar el stock, solo si hay suficiente
        for (const item of pedidoPrevio.items) {
          const { count } = await tx.producto.updateMany({
            where: { id: item.productoId, stock: { gte: item.cantidad } },
            data: { stock: { decrement: item.cantidad } }
          });
          if (count === 0) {
            throw new Error(`VALIDATION:Stock insuficiente para reactivar el pedido ("${item.producto?.nombre || `ID #${item.productoId}`}").`);
          }
        }
      }

      // Actualizar el pedido
      await tx.pedido.update({
        where: { id },
        data: { estado }
      });
    });

    // Obtenemos el pedido actualizado de la bd o asumimos sus valores previos para continuar
    const pedidoActualizado = { ...pedidoPrevio, estado };

    // Cancelar o reactivar cambia el gasto del cliente: se actualiza en Brevo
    if ((pedidoPrevio.estado === 'cancelado') !== (estado === 'cancelado')) {
      sincronizarCliente(pedidoPrevio.usuarioId);
    }
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
    if (pedidoPrevio.usuario?.email) {
      const estadoInfo = estadoLabels[estado] || { label: estado, color: '#475569', bg: '#f1f5f9' };
      // Fire-and-forget: enviarEmail no lanza errores (si no hay RESEND_API_KEY, solo avisa)
      enviarEmail({
        to: pedidoPrevio.usuario.email,
        subject: `📦 Actualización de tu pedido #${id} — ${estadoInfo.label}`,
        html: plantillaEstadoPedido({
          pedidoId: id,
          clienteNombre: pedidoPrevio.usuario.nombre || 'Cliente',
          estadoInfo,
          items: pedidoPrevio.items,
          direccion: pedidoPrevio.direccion,
          ciudad: pedidoPrevio.ciudad,
          total: pedidoPrevio.total
        })
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    if (error.message?.startsWith('VALIDATION:')) {
      return res.status(400).json({ error: error.message.replace('VALIDATION:', '') });
    }
    res.status(500).json({ error: 'Hubo un error al actualizar el estado del pedido' });
  }
});

export default router;
