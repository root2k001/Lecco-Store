// CSS global en el MISMO orden en que Vite lo concatenaba (evaluación desde main.jsx).
// Varias hojas comparten selectores (p. ej. .carrito-vacio en principal.css y Carrito.css):
// si Next las ordenara por ruta, cambiaría la cascada y con ella el diseño.
import '../index.css';
import '../context/Toast.css';
import '../Compartidos/cabecera/principal.css';
import '../Compartidos/AuthModal/AuthModal.css';
import '../Compartidos/footer/footer.css';
import '../PaginaCatalogo/DetallesProductos/Detalles.css';
import '../PaginaCatalogo/ListaProductos/Productos.css';
import '../PaginaCatalogo/Campana.css';
import '../PaginaCarrito/Carrito.css';
import '../PaginaInformacion/Nosotros.css';
import '../PaginaInformacion/NotFound.css';
import Providers from './providers.jsx';
import { SITE_URL, SITE_NAME, SITE_DESCRIPCION } from '../lib/sitio.js';

export const metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'Lecco Store — Gafas de Sol Premium',
        template: '%s | Lecco Store'
    },
    description: SITE_DESCRIPCION,
    applicationName: SITE_NAME,
    keywords: ['gafas de sol', 'lentes de sol', 'gafas Perú', 'lentes Lima', 'Lecco Store', 'gafas premium'],
    openGraph: {
        type: 'website',
        locale: 'es_PE',
        siteName: SITE_NAME,
        title: 'Lecco Store — Gafas de Sol Premium',
        description: SITE_DESCRIPCION,
        url: '/',
        images: [{ url: '/portadaInicio.jpg', alt: 'Lecco Store — Gafas de sol' }]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Lecco Store — Gafas de Sol Premium',
        description: SITE_DESCRIPCION,
        images: ['/portadaInicio.jpg']
    },
    icons: { icon: '/lecco.svg' }
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#111111'
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Syne:wght@400..800&display=swap"
                />
            </head>
            <body>
                {/* #root conserva los estilos de index.css de la versión Vite */}
                <div id="root">
                    <Providers>{children}</Providers>
                </div>
            </body>
        </html>
    );
}
