// URL del backend Express (Render). La usan next.config (proxy /api) y los
// componentes de servidor (fetch directo al renderizar las páginas).
// - Docker Compose: http://backend:3000  · Local: http://localhost:3000
export const BACKEND_URL = (
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://lecco-store-1.onrender.com' : 'http://localhost:3000')
).replace(/\/$/, '');
