import { cache } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Campana from '../../../PaginaCatalogo/Campana.jsx';
import { apiServidor } from '../../../lib/apiServidor.js';
import { nuevoClienteServidor, precargarCatalogo } from '../../../lib/precarga.js';

export const revalidate = 60;

// Sin pre-generar en el build: cada URL se genera en su primera visita y queda en caché (ISR)
export async function generateStaticParams() {
    return [];
}

// Compartido entre generateMetadata y la página (una sola petición por render)
const cargarCampana = cache((slug) => apiServidor(`/api/campanas/slug/${encodeURIComponent(slug)}`));

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const campana = await cargarCampana(slug);
    if (!campana) {
        return { title: 'Campaña no disponible', robots: { index: false, follow: true } };
    }
    const url = `/campanas/${campana.slug}`;
    const descripcion = campana.descripcion || `${campana.titulo}: gafas de sol seleccionadas en Lecco Store.`;
    return {
        title: campana.titulo,
        description: descripcion,
        alternates: { canonical: url },
        openGraph: {
            url,
            title: `${campana.titulo} | Lecco Store`,
            description: descripcion,
            ...(campana.banner ? { images: [{ url: campana.banner, alt: campana.titulo }] } : {})
        }
    };
}

export default async function PaginaCampana({ params }) {
    const { slug } = await params;
    const qc = nuevoClienteServidor();
    const campana = await cargarCampana(slug);

    // Si el backend no responde no se fija nada: Campana la vuelve a pedir en el cliente
    if (campana) {
        qc.setQueryData(['campanas', 'slug', slug], campana);
        await precargarCatalogo(qc, { campana: campana.slug });
    }

    return (
        <HydrationBoundary state={dehydrate(qc)}>
            <Campana slug={slug} />
        </HydrationBoundary>
    );
}
