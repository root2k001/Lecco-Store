import { apiServidor } from '../lib/apiServidor.js';
import { rutaProducto } from '../lib/slug.js';
import { SITE_URL } from '../lib/sitio.js';

// /sitemap.xml — se regenera cada hora
export const revalidate = 3600;

const MAX_PAGINAS = 40; // 40 × 50 = 2000 productos

async function todosLosProductos() {
    const productos = [];
    for (let page = 1; page <= MAX_PAGINAS; page++) {
        const data = await apiServidor(`/api/productos?page=${page}&limit=50`, { revalidate });
        if (!data?.productos?.length) break;
        productos.push(...data.productos);
        if (page >= (data.totalPages || 1)) break;
    }
    return productos;
}

export default async function sitemap() {
    const ahora = new Date();
    const [productos, campanas] = await Promise.all([
        todosLosProductos(),
        apiServidor('/api/campanas/activas', { revalidate })
    ]);

    const estaticas = [
        { ruta: '/', prioridad: 1, frecuencia: 'daily' },
        { ruta: '/Lentes', prioridad: 0.9, frecuencia: 'daily' },
        { ruta: '/Sale', prioridad: 0.8, frecuencia: 'daily' },
        { ruta: '/Nosotros', prioridad: 0.4, frecuencia: 'monthly' }
    ].map(({ ruta, prioridad, frecuencia }) => ({
        url: `${SITE_URL}${ruta}`,
        lastModified: ahora,
        changeFrequency: frecuencia,
        priority: prioridad
    }));

    const paginasCampanas = (Array.isArray(campanas) ? campanas : []).map(c => ({
        url: `${SITE_URL}/campanas/${c.slug}`,
        lastModified: ahora,
        changeFrequency: 'daily',
        priority: 0.8
    }));

    const fichas = productos.map(p => ({
        url: `${SITE_URL}${rutaProducto(p)}`,
        lastModified: p.creadoEn ? new Date(p.creadoEn) : ahora,
        changeFrequency: 'weekly',
        priority: 0.7,
        ...(p.imagen && p.imagen !== 'en proceso' ? { images: [p.imagen] } : {})
    }));

    return [...estaticas, ...paginasCampanas, ...fichas];
}
