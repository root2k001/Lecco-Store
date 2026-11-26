import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Sale from '../../PaginaCatalogo/Sale.jsx';
import { nuevoClienteServidor, precargarCatalogo } from '../../lib/precarga.js';

export const revalidate = 60;

export const metadata = {
    title: 'Sale — Gafas en oferta',
    description: 'Gafas de sol en oferta en Lecco Store. Modelos premium a precios especiales, envío gratis a todo Perú.',
    alternates: { canonical: '/Sale' },
    openGraph: { url: '/Sale', title: 'Sale — Gafas en oferta | Lecco Store' }
};

export default async function PaginaSale() {
    const qc = nuevoClienteServidor();
    await precargarCatalogo(qc, { sale: true });
    return (
        <HydrationBoundary state={dehydrate(qc)}>
            <Sale />
        </HydrationBoundary>
    );
}
