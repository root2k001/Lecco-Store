// Peticiones del catálogo. Módulo compartido entre servidor (precarga SSR) y cliente.
// `base` vacío = URL relativa (/api, proxy de Next); en servidor se pasa BACKEND_URL.
import { mapearProducto } from './mapearProducto.js';

export const ITEMS_POR_PAGINA = 16;

// React Query cachea por queryKey: el servidor precarga con la misma clave que usa el cliente
export const claveProductos = ({ pagina, orden, colorSeleccionado, sale, campana }) =>
    ['productos', { pagina, orden, colorSeleccionado, sale, campana }];

export const CLAVE_COLORES = ['productos', 'colores'];

export const obtenerColores = async (base = '') => {
    const res = await fetch(`${base}/api/productos/colores`);
    if (!res.ok) throw new Error('Error cargando lista de colores');
    return res.json();
};

export const obtenerProductos = async ({ pagina, orden, colorSeleccionado, sale, campana }, base = '') => {
    const params = new URLSearchParams({
        page: String(pagina),
        limit: String(ITEMS_POR_PAGINA),
        orden
    });

    if (colorSeleccionado) {
        params.append('color', colorSeleccionado);
    }

    // En la pestaña /Sale solo se piden productos en oferta
    if (sale) {
        params.append('sale', 'true');
    }

    // En /campanas/:slug solo se piden los productos de esa campaña
    if (campana) {
        params.append('campana', campana);
    }

    const response = await fetch(`${base}/api/productos?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Error al cargar los productos desde el servidor');
    }

    const data = await response.json();
    return {
        productos: (data.productos || data).map(mapearProducto),
        totalPaginas: data.totalPages ?? 1,
        totalProductos: data.total ?? 0
    };
};
