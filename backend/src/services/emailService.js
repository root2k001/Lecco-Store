import { Resend } from 'resend';

// Instancia singleton — se crea una sola vez al importar el módulo
let resendInstance = null;

/**
 * Obtiene la instancia de Resend (lazy singleton).
 * Devuelve null si no hay API key configurada.
 */
const getResend = () => {
  if (resendInstance) return resendInstance;
  if (!process.env.RESEND_API_KEY) return null;
  resendInstance = new Resend(process.env.RESEND_API_KEY);
  return resendInstance;
};

/**
 * Envía un email usando Resend.
 * No lanza errores — loguea y devuelve { success, error }.
 */
export const enviarEmail = async ({ to, subject, html }) => {
  const resend = getResend();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY no configurada. Email no enviado.');
    return { success: false, error: 'API key no configurada' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Lecco Store <onboarding@resend.dev>';

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });

    if (error) {
      console.error('[Email] Error de Resend:', error);
      return { success: false, error };
    }

    console.log(`[Email] Enviado a ${to} — id: ${data?.id}`);
    return { success: true, data };
  } catch (err) {
    console.error('[Email] Excepción enviando email:', err);
    return { success: false, error: err.message };
  }
};
