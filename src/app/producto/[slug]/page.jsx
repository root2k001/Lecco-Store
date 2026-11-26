import { cache } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import Cabecera from '../../../Compartidos/cabecera/cabecera.jsx';
import PiePagina from '../../../Compartidos/footer/Footer.jsx';
import { FichaProducto } from '../../../PaginaCatalogo/DetallesProductos/DetallesProductos.jsx';
import { mapearProducto } from '../../../PaginaCatalogo/mapearProducto.js';
import JsonLd from '../../../lib/JsonLd.jsx';
import { apiServidorEstricto } from '../../../lib/apiServidor.js';
import { idDesdeSlug, rutaProducto } from '../../../lib/slug.js';
import { SITE_URL, SITE_NAME } from '../../../lib/sitio.js';

// Las fichas se generan bajo demanda y se regeneran como mucho cada 60 s (precio/stock)
export const revalidate = 60;

// Sin pre-generar en el build: cada URL se genera en su primera visita y queda en caché (ISR)
export async function generateStaticParams() {
    return [];
}

const cargarProducto = cache((id) => apiServidorEstricto(`/api/productos/${id}`));

const imagenesDe = (p) => [p.imagen, ...(p.imagenesAdicionales || [])]
    .filter(url => url && url !== 'en proceso');

const descripcionDe = (p) => {
    const base = p.descripcion?.trim() || `${p.nombre}: gafas de sol de Lecco Store. Envío gratis a todo Perú.`;
    return base.length > 160 ? `${base.slice(0, 157)}...` : base;
};

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const id = idDesdeSlug(slug);
    const p = id ? await cargarProducto(id) : null;
    if (!p) return { title: 'Producto no encontrado', robots: { index: false } };

    const url = rutaProducto(p);
    const descripcion = descripcionDe(p);
    const imagenes = imagenesDe(p);
    return {
        title: p.nombre,
        description: descripcion,
        alternates: { canonical: url },
        openGraph: {
            url,
            title: `${p.nombre} | ${SITE_NAME}`,
            description: descripcion,
            ...(imagenes.length ? { images: imagenes.slice(0, 4).map(src => ({ url: src, alt: p.nombre })) } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: p.nombre,
            description: descripcion,
            ...(imagenes.length ? { images: [imagenes[0]] } : {})
        }
    };
}

export default async function PaginaProducto({ params }) {
    const { slug } = await params;
    const id = idDesdeSlug(slug);
    if (!id) notFound();

    const p = await cargarProducto(id);
    if (!p) notFound();

    // Una sola URL por producto (si cambia el nombre, la antigua redirige con 308)
    const canonica = rutaProducto(p);
    if (`/producto/${slug}` !== canonica) permanentRedirect(canonica);

    const producto = mapearProducto(p);
    const imagenes = imagenesDe(p);

    return (
        <div className="Principal-container">
            <Cabecera />

            <nav className="ficha-migas" aria-label="Ruta de navegación">
                <Link href="/">Inicio</Link> / <Link href="/Lentes">Lentes</Link> / <span>{p.nombre}</span>
            </nav>

            <div className="ficha-pagina">
                <FichaProducto producto={producto} />
            </div>

            <PiePagina />

            <JsonLd datos={[
                {
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: p.nombre,
                    sku: String(p.id),
                    description: descripcionDe(p),
                    ...(imagenes.length ? { image: imagenes } : {}),
                    ...(p.color ? { color: p.color } : {}),
                    brand: { '@type': 'Brand', name: 'Lecco' },
                    offers: {
                        '@type': 'Offer',
                        url: `${SITE_URL}${canonica}`,
                        priceCurrency: 'PEN',
                        price: Number(p.precio).toFixed(2),
                        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        itemCondition: 'https://schema.org/NewCondition',
                        seller: { '@type': 'Organization', name: SITE_NAME }
                    }
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
                        { '@type': 'ListItem', position: 2, name: 'Lentes', item: `${SITE_URL}/Lentes` },
                        { '@type': 'ListItem', position: 3, name: p.nombre, item: `${SITE_URL}${canonica}` }
                    ]
                }
            ]} />
        </div>
    );
}
