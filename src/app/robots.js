import { SITE_URL } from '../lib/sitio.js';

// /robots.txt
export default function robots() {
    return {
        rules: [{
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/perfil', '/Carrito', '/pago/', '/api/']
        }],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL
    };
}
