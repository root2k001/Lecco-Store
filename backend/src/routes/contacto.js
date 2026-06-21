import { Router } from 'express';
import prisma from '../prisma.js';
import { Resend } from 'resend';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Helper para crear el cliente Resend (usa API HTTP, no SMTP — funciona en Render)
const crearResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

// GET /api/contacto — Obtener todos los mensajes (Admin)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const mensajes = await prisma.mensajeContacto.findMany({
      orderBy: { creadoEn: 'desc' }
    });
    res.json(mensajes);
  } catch (error) {
    console.error('Error al obtener mensajes de contacto:', error);
    res.status(500).json({ error: 'Error al obtener los mensajes de contacto' });
  }
});

// DELETE /api/contacto/:id — Eliminar un mensaje (Admin)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.mensajeContacto.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Mensaje eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar mensaje de contacto:', error);
    res.status(500).json({ error: 'Error al eliminar el mensaje' });
  }
});

// Endpoint para recibir formulario de contacto
router.post('/', async (req, res) => {
  const { nombre, email, telefono, mensaje } = req.body;

  // Validaciones básicas
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
  }
  if (!mensaje || !mensaje.trim()) {
    return res.status(400).json({ error: 'El mensaje es obligatorio.' });
  }

  try {
    // 1. Guardar el mensaje en la base de datos
    const nuevoMensaje = await prisma.mensajeContacto.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono ? telefono.trim() : null,
        mensaje: mensaje.trim()
      }
    });

    // 2. Enviar correo con Resend (API HTTP — funciona en Render sin problemas de SMTP)
    const resend = crearResend();
    if (resend) {
      const adminEmail = process.env.ADMIN_EMAIL || 'onboarding@resend.dev';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lecco Store <onboarding@resend.dev>';

      resend.emails.send({
        from: fromEmail,
        reply_to: email.trim(),
        to: adminEmail,
        subject: `📬 Nuevo mensaje de contacto de ${nombre.trim()}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #334155;">
            <h2 style="color: #1e293b; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-top: 0; font-weight: 600;">📬 Nuevo Mensaje de Contacto</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px; color: #475569;">Cliente:</td>
                <td style="padding: 6px 0; color: #1e293b;">${nombre.trim()}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Correo:</td>
                <td style="padding: 6px 0;"><a href="mailto:${email.trim()}" style="color: #111827; text-decoration: none;">${email.trim()}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Teléfono:</td>
                <td style="padding: 6px 0; color: #1e293b;">${telefono ? telefono.trim() : 'No especificado'}</td>
              </tr>
            </table>

            <div style="background-color: #f8fafc; padding: 18px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #111827;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #475569; font-size: 14px;">Mensaje:</p>
              <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${mensaje.trim()}</p>
            </div>

            <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">
              Enviado desde el formulario de contacto de Lecco Store.
            </p>
          </div>
        `
      }).then(() => {
        console.log('Correo de contacto enviado exitosamente a:', adminEmail);
      }).catch((err) => {
        console.error('Error al enviar correo de contacto con Resend:', err);
      });
    } else {
      console.warn('Correo deshabilitado: configura RESEND_API_KEY en las variables de entorno.');
    }

    res.status(201).json({
      message: 'Mensaje de contacto recibido y guardado exitosamente',
      mensaje: nuevoMensaje
    });
  } catch (error) {
    console.error('Error al procesar el formulario de contacto:', error);
    res.status(500).json({ error: 'Hubo un error interno al procesar el mensaje de contacto.' });
  }
});

export default router;
