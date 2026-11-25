// Campañas vigentes (cabecera y carrusel de inicio). Comparten la caché de React Query.
export const CLAVE_CAMPANAS_ACTIVAS = ['campanas', 'activas'];

export const obtenerCampanasActivas = async () => {
    const res = await fetch('/api/campanas/activas');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
};

export const obtenerProductosDeCampana = async (slug) => {
    const res = await fetch(`/api/productos?campana=${encodeURIComponent(slug)}&page=1&limit=20`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.productos || [];
};
