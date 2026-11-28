import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import Carrito from '../PaginaCarrito/Carrito.jsx';
import { renderRuta, renderConProviders } from '../test/renderRuta.jsx';
import { capturarCampanaDeUrl, obtenerCampanaOrigen, enlaceCampana } from '../utils/campanaOrigen.js';

const verano = {
    id: 1, slug: 'verano-2027', titulo: 'Colección de Verano', descripcion: 'Gafas para el sol',
    banner: 'https://res.cloudinary.com/demo/banner.jpg',
    inicio: '2026-11-01T05:00:00.000Z', fin: '2027-03-31T04:59:59.000Z'
};
const producto = (id, nombre) => ({ id, nombre, precio: '150.00', imagen: null, genero: 'unisex', stock: 5 });

const json = (data, ok = true, status = ok ? 200 : 404) => Promise.resolve({
    ok, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

// API simulada; `campanas` = campañas vigentes
const mockApi = (campanas) => vi.fn((url) => {
    if (url.startsWith('/api/usuarios')) return json({ error: 'No autorizado' }, false, 401);
    if (url === '/api/campanas/activas') return json(campanas);
    if (url.startsWith('/api/campanas/slug/')) {
        const slug = url.split('/').pop();
        const c = campanas.find(x => x.slug === slug);
        return c ? json(c) : json({ error: 'Campaña no encontrada' }, false, 404);
    }
    if (url.startsWith('/api/productos/colores')) return json([]);
    if (url.includes('campana=verano-2027')) return json({ productos: [producto(10, 'Gafa Playa')], total: 1, page: 1, totalPages: 1 });
    return json({ productos: [producto(20, 'Gafa Normal')], total: 1, page: 1, totalPages: 1 });
});

const renderApp = (ruta) => renderRuta(ruta);

const urls = () => globalThis.fetch.mock.calls.map(([url]) => url);

describe('Campañas en la tienda', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('la pestaña de la campaña aparece en la cabecera solo si hay una vigente', async () => {
        globalThis.fetch = mockApi([verano]);
        const { unmount } = renderApp('/Lentes');
        const enlace = await screen.findByRole('link', { name: 'Colección de Verano' });
        expect(enlace).toHaveAttribute('href', '/campanas/verano-2027');
        unmount();

        globalThis.fetch = mockApi([]);
        renderApp('/Lentes');
        await screen.findByText('Gafa Normal');
        expect(screen.queryByRole('link', { name: 'Colección de Verano' })).not.toBeInTheDocument();
    });

    it('/campanas/:slug muestra el banner, la vigencia y solo los productos de la campaña', async () => {
        globalThis.fetch = mockApi([verano]);
        renderApp('/campanas/verano-2027');

        expect(await screen.findByRole('heading', { name: 'Colección de Verano' })).toBeInTheDocument();
        expect(await screen.findByText('Gafa Playa')).toBeInTheDocument();
        expect(screen.queryByText('Gafa Normal')).not.toBeInTheDocument();
        expect(screen.getByAltText('Colección de Verano')).toHaveAttribute('src', verano.banner);
        expect(screen.getByText(/Gafas para el sol · Disponible hasta el/)).toBeInTheDocument();
        const pedidosProductos = urls().filter(u => u.startsWith('/api/productos?'));
        expect(pedidosProductos.every(u => u.includes('campana=verano-2027'))).toBe(true);
    });

    it('una campaña terminada o inexistente muestra un aviso y enlace al catálogo', async () => {
        globalThis.fetch = mockApi([]);
        renderApp('/campanas/verano-2027');
        expect(await screen.findByText('Esta campaña no está disponible')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver todos los lentes' })).toHaveAttribute('href', '/Lentes');
    });

    it('el inicio destaca la campaña vigente con su carrusel y "Ver todos" a su página', async () => {
        globalThis.fetch = mockApi([verano]);
        renderApp('/');
        const titulo = await screen.findByRole('heading', { name: 'Colección de Verano' });
        const seccion = titulo.closest('section');
        expect(await within(seccion).findByText('Gafa Playa')).toBeInTheDocument();
        expect(within(seccion).getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/campanas/verano-2027');
    });
});

describe('Atribución de ventas (utm_campaign)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('guarda el utm_campaign válido de la URL e ignora valores inválidos', () => {
        capturarCampanaDeUrl('?utm_source=brevo&utm_campaign=Verano-2027');
        expect(obtenerCampanaOrigen()).toBe('verano-2027');

        capturarCampanaDeUrl('?utm_campaign=<script>alert(1)</script>');
        expect(obtenerCampanaOrigen()).toBe('verano-2027'); // no se sobrescribe con basura
    });

    it('el enlace para Brevo lleva la página y los UTM de la campaña', () => {
        expect(enlaceCampana('verano-2027', 'https://lecco.pe'))
            .toBe('https://lecco.pe/campanas/verano-2027?utm_source=brevo&utm_medium=email&utm_campaign=verano-2027');
    });

    it('el pedido se envía con la campaña de origen', async () => {
        sessionStorage.setItem('lecco-campana-origen', 'verano-2027');
        localStorage.setItem('carrito-lecco', JSON.stringify([{ id: 10, name: 'Gafa Playa', price: 150, quantity: 1, stock: 5 }]));
        globalThis.fetch = vi.fn((url) => {
            if (url === '/api/pedidos') return json({ pedido: { id: 99 } }, true, 201);
            return json({ error: 'No autorizado' }, false, 401);
        });
        const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);

        renderConProviders(<Carrito />);

        fireEvent.click(await screen.findByText('Proceder al Pago'));
        fireEvent.change(screen.getByPlaceholderText('Dirección completa'), { target: { value: 'Av. Sol 123' } });
        fireEvent.change(screen.getByPlaceholderText('Ciudad'), { target: { value: 'Lima' } });
        fireEvent.change(screen.getByPlaceholderText('C.P.'), { target: { value: '15001' } });
        fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '999999999' } });
        fireEvent.click(screen.getByText('Confirmar por WhatsApp'));

        await waitFor(() => expect(urls()).toContain('/api/pedidos'));
        const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/pedidos');
        expect(JSON.parse(opciones.body).origenCampana).toBe('verano-2027');
        expect(JSON.parse(opciones.body).metodoPago).toBe('whatsapp');
        abrir.mockRestore();
    });
});
