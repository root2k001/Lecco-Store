import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma.js';

const router = Router();

// Compara el token en tiempo constante (evita ataques de temporización)
const tokenValido = (recibido) => {
  const esperado = process.env.BREVO_WEBHOOK_TOKEN;
  if (!esperado || !recibido) return false;
  const a = Buffer.from(String(recibido));
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const tokenDeLaPeticion = (req) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.query.token;
};

/**
 * POST /api/webhooks/brevo — Webhook de marketing de Brevo.
 * Al darse de baja de una campaña (event: "unsubscribe") se retira el
 * consentimiento en nuestra BD, para que ambos sistemas estén alineados.
 * Brevo puede enviar un evento o un lote (array).
 */
router.post('/brevo', async (req, res) => {
  if (!tokenValido(tokenDeLaPeticion(req))) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const eventos = Array.isArray(req.body) ? req.body : [req.body];
  const emailsBaja = [...new Set(
    eventos
      .filter(e => e?.event === 'unsubscribe' && typeof e.email === 'string')
      .map(e => e.email.trim().toLowerCase())
  )];

  try {
    if (emailsBaja.length > 0) {
      await prisma.usuario.updateMany({
        where: { email: { in: emailsBaja, mode: 'insensitive' } },
        data: { aceptaMarketing: false }
      });
    }
    res.json({ recibidos: eventos.length, bajas: emailsBaja.length });
  } catch (error) {
    console.error('Error procesando webhook de Brevo:', error);
    // 500 → Brevo reintenta el envío
    res.status(500).json({ error: 'Error procesando el webhook' });
  }
});

export default router;
