import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { suscribirNewsletter } from '../services/brevoService.js';

const router = Router();

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: 'Demasiados intentos de suscripción. Intenta de nuevo más tarde.' }
});

const suscripcionSchema = z.object({
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido.').max(254),
  nombre: z.string().trim().max(100).optional().or(z.literal(''))
});

// POST /api/newsletter — Suscripción pública con doble opt-in (Brevo envía el correo de confirmación)
router.post('/', newsletterLimiter, async (req, res) => {
  const validacion = suscripcionSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: validacion.error.issues[0]?.message || 'Datos inválidos' });
  }
  const { email, nombre } = validacion.data;

  const resultado = await suscribirNewsletter({ email, nombre: nombre || undefined });

  if (!resultado.configurado) {
    return res.status(503).json({ error: 'La suscripción no está disponible en este momento.' });
  }
  if (!resultado.ok) {
    return res.status(502).json({ error: 'No se pudo completar la suscripción. Intenta de nuevo más tarde.' });
  }

  // Mismo mensaje exista o no el contacto: no revela qué correos están suscritos
  res.json({ message: 'Revisa tu correo y confirma tu suscripción.' });
});

export default router;
