import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Inicio from '../PaginaInicio/Inicio.jsx';
import JsonLd from '../lib/JsonLd.jsx';
import { apiServidor } from '../lib/apiServidor.js';
import { nuevoClienteServidor, precargarComun, precargarCampanaInicio } from '../lib/precarga.js';
import { CLAVE_CAMPANAS_ACTIVAS } from '../utils/campanasApi.js';
import { SITE_URL, SITE_NAME, SITE_DESCRIPCION } from '../lib/sitio.js';

// ISR: la página se regenera como mucho cada 60 s con los productos actuales
export const revalidate = 60;

export const metadata = {
    alternates: { canonical: '/' }
};

const lista = (data) => (data ? (data.productos || data) : []);

export default async function PaginaInicio() {
    const qc = nuevoClienteServidor();
    const [general, coleccion, sale] = await Promise.all([
        apiServidor('/api/productos?page=1&limit=50'),
        apiServidor('/api/productos?coleccion=true&page=1&limit=20'),
        apiServidor('/api/productos?sale=true&page=1&limit=20'),
        precargarComun(qc)
    ]);

    const campanaDestacada = (qc.getQueryData(CLAVE_CAMPANAS_ACTIVAS) || [])[0];
    if (campanaDestacada) await precargarCampanaInicio(qc, campanaDestacada.slug);

    // Sin respuesta del backend → el cliente pide los carruseles (como en la versión SPA)
    const datosIniciales = general
        ? { general: lista(general), coleccion: lista(coleccion), sale: lista(sale) }
        : null;

    return (
        <>
            <JsonLd datos={[
                {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: SITE_NAME,
                    url: SITE_URL,
                    logo: `${SITE_URL}/vite.svg`,
                    sameAs: ['https://www.instagram.com/lecco.eyewear']
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: SITE_NAME,
                    url: SITE_URL,
                    description: SITE_DESCRIPCION,
                    inLanguage: 'es-PE'
                }
            ]} />
            <HydrationBoundary state={dehydrate(qc)}>
                <Inicio datosIniciales={datosIniciales} />
            </HydrationBoundary>
        </>
    );
}
