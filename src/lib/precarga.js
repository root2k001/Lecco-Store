// Precarga de datos en el servidor para React Query (SSR/ISR).
// Las claves son las MISMAS que usan los componentes cliente: al hidratar, el HTML
// ya trae los productos (indexables) y el cliente no repite la petición.
import { QueryClient } from '@tanstack/react-query';
import { BACKEND_URL } from './backendUrl.js';
import { CLAVE_CAMPANAS_ACTIVAS, obtenerCampanasActivas, obtenerProductosDeCampana } from '../utils/campanasApi.js';
import { CLAVE_COLORES, claveProductos, obtenerColores, obtenerProductos } from '../PaginaCatalogo/productosApi.js';

const LIMITE_MS = 8000;

// Si el backend tarda (Render dormido), se renderiza sin datos y el cliente los pide
const conLimite = (promesa) => Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), LIMITE_MS))
]);

export const nuevoClienteServidor = () => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: false } }
});

// Campañas vigentes: pestañas de la cabecera (enlaces internos indexables)
export const precargarComun = (qc) => qc.prefetchQuery({
    queryKey: CLAVE_CAMPANAS_ACTIVAS,
    queryFn: () => conLimite(obtenerCampanasActivas(BACKEND_URL))
});

// Primera página del catálogo con el orden y filtros por defecto de ProductosList
export const precargarCatalogo = (qc, { sale = false, campana = null } = {}) => {
    const filtros = { pagina: 1, orden: 'relevante', colorSeleccionado: null, sale, campana };
    return Promise.all([
        precargarComun(qc),
        qc.prefetchQuery({ queryKey: CLAVE_COLORES, queryFn: () => conLimite(obtenerColores(BACKEND_URL)) }),
        qc.prefetchQuery({ queryKey: claveProductos(filtros), queryFn: () => conLimite(obtenerProductos(filtros, BACKEND_URL)) })
    ]);
};

// Carrusel de la campaña destacada en el inicio
export const precargarCampanaInicio = (qc, slug) => qc.prefetchQuery({
    queryKey: ['productos', 'campana-inicio', slug],
    queryFn: () => conLimite(obtenerProductosDeCampana(slug, BACKEND_URL))
});
