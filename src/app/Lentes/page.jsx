import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import Lentes from '../../PaginaCatalogo/Lentes.jsx';
import { nuevoClienteServidor, precargarCatalogo } from '../../lib/precarga.js';

export const revalidate = 60;

export const metadata = {
    title: 'Lentes de sol',
    description: 'Descubre nuestra colección de gafas y lentes de sol con acabados de lujo. Envío gratis a todo Perú.',
    alternates: { canonical: '/Lentes' },
    openGraph: { url: '/Lentes', title: 'Lentes de sol | Lecco Store' }
};

export default async function PaginaLentes() {
    const qc = nuevoClienteServidor();
    await precargarCatalogo(qc);
    return (
        <HydrationBoundary state={dehydrate(qc)}>
            <Lentes />
        </HydrationBoundary>
    );
}
