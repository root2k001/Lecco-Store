import { Router } from 'express';
import prisma from '../prisma.js';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

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
    // 1. Guardar el mensaje en la base de datos (PostgreSQL / Neon)
    const nuevoMensaje = await prisma.mensajeContacto.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono ? telefono.trim() : null,
        mensaje: mensaje.trim()
      }
    });

    // 2. Configurar el transporte de Nodemailer (SMTP)
    // Solo intentamos enviar si las credenciales mínimas de SMTP están configuradas
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: 587,           // Siempre 587 (STARTTLS) — el 465 resuelve a IPv6 en Render
          secure: false,       // false = STARTTLS, no SSL puro
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: { rejectUnauthorized: false },
          family: 4,
          lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { ...options, family: 4 }, callback);
          }
        });

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        // Enviamos el correo en segundo plano para evitar timeouts (502 Gateway Error)
        transporter.sendMail({
          from: `"Contacto Lecco" <${process.env.SMTP_USER}>`,
          replyTo: email.trim(),
          to: adminEmail,
          subject: `📬 Nuevo mensaje de contacto de ${nombre.trim()}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #334155;">
              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 0; font-weight: 600;">Nuevo Mensaje Recibido</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 120px; color: #475569;">Cliente:</td>
                  <td style="padding: 6px 0; color: #1e293b;">${nombre.trim()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #475569;">Correo:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${email.trim()}" style="color: #3b82f6; text-decoration: none;">${email.trim()}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #475569;">Teléfono:</td>
                  <td style="padding: 6px 0; color: #1e293b;">${telefono ? telefono.trim() : 'No especificado'}</td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; padding: 18px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #475569; font-size: 14px;">Mensaje:</p>
                <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${mensaje.trim()}</p>
              </div>

              <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">
                Este mensaje fue enviado de forma segura desde el formulario de contacto de Lecco Store.
              </p>
            </div>
          `
        }).then(() => {
          console.log('Correo de contacto enviado exitosamente a:', adminEmail);
        }).catch((emailErr) => {
          console.error('Error al enviar el correo de contacto en segundo plano:', emailErr);
        });

      } catch (transporterErr) {
        console.error('Error al inicializar el transporte de nodemailer:', transporterErr);
      }
    } else {
      console.warn('El envío de correo de contacto está deshabilitado (SMTP_USER o SMTP_PASS no configurados).');
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
