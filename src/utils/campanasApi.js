// Campañas vigentes (cabecera y carrusel de inicio). Comparten la caché de React Query.
// `base` vacío = URL relativa (cliente); en servidor se pasa BACKEND_URL para la precarga SSR.
export const CLAVE_CAMPANAS_ACTIVAS = ['campanas', 'activas'];

export const obtenerCampanasActivas = async (base = '') => {
    const res = await fetch(`${base}/api/campanas/activas`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
};

export const obtenerProductosDeCampana = async (slug, base = '') => {
    const res = await fetch(`${base}/api/productos?campana=${encodeURIComponent(slug)}&page=1&limit=20`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.productos || [];
};

// Campaña por slug: null si no existe, no ha empezado o ya terminó
export const obtenerCampana = async (slug, base = '') => {
    const res = await fetch(`${base}/api/campanas/slug/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Error al cargar la campaña');
    return res.json();
};
