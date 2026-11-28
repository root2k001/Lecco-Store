// Datos públicos del sitio (disponibles en servidor y cliente)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
export const SITE_NAME = 'Lecco Store';
export const SITE_DESCRIPCION = 'Lecco Store — Gafas de sol y lentes con estilo premium, calidad y diseño exclusivo.';
export const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || '51966894989';
