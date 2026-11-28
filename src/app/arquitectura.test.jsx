/**
 * Tests de arquitectura de la migración a Next.js:
 * rutas, metadatos SEO, proxy /api, precarga en servidor (SSR), ficha de producto,
 * sitemap/robots y orden del CSS global (garantiza el mismo diseño que la versión Vite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import nextConfig from '../../next.config.mjs';
import { BACKEND_URL } from '../lib/backendUrl.js';
import { renderRuta, renderConProviders } from '../test/renderRuta.jsx';

const json = (data, ok = true, status = ok ? 200 : 404) => Promise.resolve({
    ok, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

const productoApi = (id, nombre, extra = {}) => ({
    id, nombre, precio: '150.00', imagen: `https://res.cloudinary.com/demo/${id}.jpg`, genero: 'unisex',
    stock: 5, color: 'Negro', descripcion: `Descripción de ${nombre}`, imagenesAdicionales: [], videos: [],
    creadoEn: '2026-11-01T00:00:00.000Z', ...extra
});

// Backend simulado: responde igual a rutas relativas (cliente) y absolutas (servidor)
const mockBackend = ({ productos = [productoApi(1, 'Gafa Aviador')], fallo = false } = {}) => vi.fn((url) => {
    const u = String(url).replace(BACKEND_URL, '');
    if (fallo) return json({ error: 'caído' }, false, 500);
    if (u.startsWith('/api/usuarios')) return json({ error: 'No autorizado' }, false, 401);
    if (u === '/api/campanas/activas') return json([]);
    if (u === '/api/productos/colores') return json(['Negro']);
    const ficha = /^\/api\/productos\/(\d+)$/.exec(u);
    if (ficha) {
        const p = productos.find(x => x.id === Number(ficha[1]));
        return p ? json(p) : json({ error: 'Producto no encontrado' }, false, 404);
    }
    if (u.startsWith('/api/productos?')) {
        const sale = u.includes('sale=true');
        const lista = productos.filter(p => !sale || p.sale);
        return json({ productos: lista, total: lista.length, page: 1, totalPages: 1 });
    }
    return json({});
});

const urlsCliente = () => globalThis.fetch.mock.calls.map(([u]) => String(u)).filter(u => u.startsWith('/api/'));

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    globalThis.fetch = mockBackend();
});

// ── 1. Configuración de Next ─────────────────────────────────────────────────
describe('next.config', () => {
    it('/Coleccion redirige de forma permanente a /Lentes', async () => {
        const redirecciones = await nextConfig.redirects();
        expect(redirecciones).toContainEqual({ source: '/Coleccion', destination: '/Lentes', permanent: true });
    });

    it('/api se sirve como proxy al backend Express (mismas cookies de sesión)', async () => {
        const rewrites = await nextConfig.rewrites();
        expect(rewrites).toContainEqual({ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` });
    });
});

// ── 2. Rutas y metadatos ─────────────────────────────────────────────────────
describe('Rutas de la app', () => {
    const paginas = import.meta.glob('./**/page.jsx', { eager: true });
    const metadataDe = (carpeta) => paginas[`./${carpeta}page.jsx`]?.metadata;

    it('existen todas las rutas de la versión SPA (mismas URLs) y la nueva ficha de producto', () => {
        const rutas = Object.keys(paginas).map(p => p.replace(/^\./, '').replace(/\/?page\.jsx$/, '') || '/').sort();
        expect(rutas).toEqual(['/', '/Carrito', '/Lentes', '/Nosotros', '/Sale', '/admin',
            '/campanas/[slug]', '/pago/resultado', '/perfil', '/producto/[slug]'].sort());
        Object.values(paginas).forEach(m => expect(typeof m.default).toBe('function'));
    });

    it('las páginas públicas tienen título, descripción y URL canónica', () => {
        expect(metadataDe('').alternates.canonical).toBe('/');
        for (const [carpeta, canonica] of [['Lentes/', '/Lentes'], ['Sale/', '/Sale'], ['Nosotros/', '/Nosotros']]) {
            const m = metadataDe(carpeta);
            expect(m.alternates.canonical).toBe(canonica);
            expect(m.title).toBeTruthy();
            expect(m.description.length).toBeGreaterThan(50);
        }
    });

    it('carrito, perfil, admin y resultado de pago no se indexan (ni heredan canónica)', () => {
        for (const carpeta of ['Carrito/', 'perfil/', 'admin/', 'pago/resultado/']) {
            const m = metadataDe(carpeta);
            expect(m.robots.index).toBe(false);
            expect(m.alternates).toBeUndefined();
        }
    });
});

// ── 3. Precarga en el servidor (SEO) ─────────────────────────────────────────
describe('Precarga en el servidor', () => {
    it('/Lentes llega con los productos ya renderizados: el cliente no los vuelve a pedir', async () => {
        const { default: PaginaLentes } = await import('./Lentes/page.jsx');
        const elemento = await PaginaLentes();
        globalThis.fetch.mockClear();

        renderConProviders(elemento);

        // Visible en el primer render (sin esperar): es lo que recibe el buscador
        expect(screen.getByText('Gafa Aviador')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Gafa Aviador' })).toHaveAttribute('href', '/producto/1-gafa-aviador');
        expect(urlsCliente().filter(u => u.startsWith('/api/productos?'))).toEqual([]);
    });

    it('si el backend no responde, la página se renderiza igual y el cliente pide los datos', async () => {
        globalThis.fetch = mockBackend({ fallo: true });
        const { default: PaginaLentes } = await import('./Lentes/page.jsx');
        const elemento = await PaginaLentes();

        globalThis.fetch = mockBackend();
        renderConProviders(elemento);
        expect(await screen.findByText('Gafa Aviador')).toBeInTheDocument();
        expect(urlsCliente().some(u => u.startsWith('/api/productos?'))).toBe(true);
    });

    it('/Sale sigue pidiendo solo productos en oferta', async () => {
        renderRuta('/Sale');
        await screen.findByText('VER TODOS LOS PRODUCTOS');
        const urls = urlsCliente().filter(u => u.startsWith('/api/productos?'));
        expect(urls.length).toBeGreaterThan(0);
        expect(urls.every(u => u.includes('sale=true'))).toBe(true);
    });
});

// ── 4. Ficha de producto /producto/[slug] ────────────────────────────────────
describe('Ficha de producto', () => {
    const params = (slug) => ({ params: Promise.resolve({ slug }) });
    const cargar = () => import('./producto/[slug]/page.jsx');

    it('renderiza la ficha con datos estructurados schema.org Product', async () => {
        const { default: Pagina } = await cargar();
        renderConProviders(await Pagina(params('1-gafa-aviador')));

        expect(screen.getByRole('heading', { level: 1, name: 'Gafa Aviador' })).toBeInTheDocument();
        const datos = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML);
        expect(datos[0]).toMatchObject({
            '@type': 'Product', name: 'Gafa Aviador', sku: '1',
            offers: { priceCurrency: 'PEN', price: '150.00', availability: 'https://schema.org/InStock' }
        });
        expect(datos[1]['@type']).toBe('BreadcrumbList');
    });

    it('metadatos: título, canónica e imagen Open Graph del producto', async () => {
        const { generateMetadata } = await cargar();
        const m = await generateMetadata(params('1-gafa-aviador'));
        expect(m.title).toBe('Gafa Aviador');
        expect(m.alternates.canonical).toBe('/producto/1-gafa-aviador');
        expect(m.openGraph.images[0].url).toBe('https://res.cloudinary.com/demo/1.jpg');
    });

    it('un slug desactualizado redirige (308) a la URL canónica', async () => {
        const { default: Pagina } = await cargar();
        await expect(Pagina(params('1-nombre-viejo'))).rejects.toMatchObject({ tipo: 'PERMANENT_REDIRECT', destino: '/producto/1-gafa-aviador' });
    });

    it('un producto inexistente o un slug sin id responden 404', async () => {
        const { default: Pagina } = await cargar();
        await expect(Pagina(params('999-x'))).rejects.toMatchObject({ tipo: 'NOT_FOUND' });
        await expect(Pagina(params('sin-id'))).rejects.toMatchObject({ tipo: 'NOT_FOUND' });
    });

    it('si el backend falla NO publica un 404 falso (lanza error y Next conserva la versión anterior)', async () => {
        globalThis.fetch = mockBackend({ fallo: true });
        const { default: Pagina } = await cargar();
        await expect(Pagina(params('2-otra-gafa'))).rejects.toThrow(/Backend respondió 500/);
    });
});

// ── 5. sitemap.xml y robots.txt ──────────────────────────────────────────────
describe('sitemap y robots', () => {
    it('el sitemap incluye las páginas públicas y la ficha de cada producto', async () => {
        const { default: sitemap } = await import('./sitemap.js');
        const urls = (await sitemap()).map(e => e.url.replace(/^https?:\/\/[^/]+/, ''));
        expect(urls).toEqual(expect.arrayContaining(['/', '/Lentes', '/Sale', '/Nosotros', '/producto/1-gafa-aviador']));
        expect(urls).not.toContain('/admin');
    });

    it('robots bloquea las zonas privadas y apunta al sitemap', async () => {
        const { default: robots } = await import('./robots.js');
        const r = robots();
        expect(r.rules[0].disallow).toEqual(expect.arrayContaining(['/admin', '/perfil', '/Carrito', '/api/']));
        expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    });
});

// ── 6. Diseño: orden del CSS global ──────────────────────────────────────────
describe('CSS global (mismo diseño que la versión Vite)', () => {
    const src = path.resolve(__dirname, '..');
    const layout = fs.readFileSync(path.join(src, 'app/layout.jsx'), 'utf8');
    const importados = [...layout.matchAll(/^import '\.\.\/(.+\.css)';/gm)].map(m => m[1]);

    it('el layout importa el CSS en el orden exacto en que Vite lo concatenaba', () => {
        expect(importados).toEqual([
            'index.css',
            'context/Toast.css',
            'Compartidos/cabecera/principal.css',
            'Compartidos/AuthModal/AuthModal.css',
            'Compartidos/footer/footer.css',
            'PaginaCatalogo/DetallesProductos/Detalles.css',
            'PaginaCatalogo/ListaProductos/Productos.css',
            'PaginaCatalogo/Campana.css',
            'PaginaCarrito/Carrito.css',
            'PaginaInformacion/Nosotros.css',
            'PaginaInformacion/NotFound.css'
        ]);
    });

    it('ninguna hoja global de la tienda queda fuera del layout (evita cascadas distintas por ruta)', () => {
        // Admin y Perfil se cargaban aparte (lazy) en Vite; los CSS Modules tienen su propio ámbito
        const excluidos = ['PaginaAdmin/', 'PaginaPerfil/'];
        const globales = fs.readdirSync(src, { recursive: true })
            .map(f => String(f).split(path.sep).join('/'))
            .filter(f => f.endsWith('.css') && !f.endsWith('.module.css') && !excluidos.some(e => f.startsWith(e)));
        expect(globales.sort()).toEqual([...importados].sort());
    });
});
