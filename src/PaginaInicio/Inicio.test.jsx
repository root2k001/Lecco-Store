import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, createEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CarritoProvider } from '../context/CarritoContext';
import { FavoritosProvider } from '../context/FavoritosContext';
import Inicio from './Inicio.jsx';

const productoApi = (id, nombre, extra = {}) => ({
    id, nombre, precio: '249.00', imagen: null, genero: 'unisex', stock: 4,
    descripcion: `Descripción de ${nombre}`, imagenesAdicionales: [], videos: [], ...extra
});

const json = (data, ok = true) => Promise.resolve({
    ok, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

// Simula la API: sesión sin usuario y los 3 carruseles (general, colección y sale)
const mockFetch = () => vi.fn((url) => {
    if (url.startsWith('/api/usuarios')) return json({ error: 'No autorizado' }, false);
    if (url.includes('sale=true')) return json({ productos: [productoApi(3, 'Gafa Sale', { sale: true })] });
    if (url.includes('coleccion=true')) return json({ productos: [productoApi(2, 'Gafa Colección')] });
    return json({ productos: [productoApi(1, 'Gafa Nueva')] });
});

const renderInicio = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
        <ToastProvider>
            <AuthProvider>
                <FavoritosProvider>
                    <CarritoProvider>
                        <Routes>
                            <Route path="/" element={<Inicio />} />
                            <Route path="/Lentes" element={<h1>Página Lentes</h1>} />
                        </Routes>
                    </CarritoProvider>
                </FavoritosProvider>
            </AuthProvider>
        </ToastProvider>
    </MemoryRouter>
    </QueryClientProvider>
);

const detalleAbierto = () => document.querySelector('.detalle-producto-container');

describe('Carruseles de la página de inicio', () => {
    beforeEach(() => {
        localStorage.clear();
        globalThis.fetch = mockFetch();
    });

    it.each([
        ['Nuevos Ingresos', 'Gafa Nueva'],
        ['Sale', 'Gafa Sale']
    ])('al pulsar un producto de "%s" se abre su detalle', async (_carrusel, nombre) => {
        renderInicio();
        const tarjeta = await screen.findByRole('button', { name: `Ver ${nombre}` });
        expect(detalleAbierto()).toBeNull();

        fireEvent.click(tarjeta);

        const detalle = detalleAbierto();
        expect(detalle).not.toBeNull();
        expect(within(detalle).getByRole('heading', { name: nombre })).toBeInTheDocument();
        expect(within(detalle).getByText(/S\/ 249/)).toBeInTheDocument();
        expect(within(detalle).getByText(`Descripción de ${nombre}`)).toBeInTheDocument();
    });

    it('al pulsar un producto del carrusel "Colección" va directo a /Lentes (sin abrir detalle)', async () => {
        renderInicio();
        fireEvent.click(await screen.findByRole('button', { name: 'Ver Gafa Colección' }));
        expect(screen.getByRole('heading', { name: 'Página Lentes' })).toBeInTheDocument();
        expect(detalleAbierto()).toBeNull();
    });

    it('las tarjetas de "Encuentra tu estilo" llevan a /Lentes', async () => {
        renderInicio();
        await screen.findByRole('button', { name: 'Ver Gafa Sale' });
        const tarjetas = screen.getAllByRole('link', { name: /Explorar/ });
        expect(tarjetas).toHaveLength(3);
        tarjetas.forEach(t => expect(t.getAttribute('href')).toBe('/Lentes'));
    });

    it('cada "Ver todos" lleva a la página de su carrusel', async () => {
        renderInicio();
        await screen.findByRole('button', { name: 'Ver Gafa Sale' });
        const destinoDe = (titulo) => within(screen.getByRole('heading', { name: titulo }).parentElement)
            .getByRole('link', { name: 'Ver todos' }).getAttribute('href');

        expect(destinoDe('Nuevos Ingresos')).toBe('/Lentes');
        expect(destinoDe('Colección')).toBe('/Lentes'); // la pestaña Colección ya no existe
        expect(destinoDe('Sale')).toBe('/Sale');
    });

    it('desde el detalle se puede añadir al carrito y cerrarlo', async () => {
        renderInicio();
        fireEvent.click(await screen.findByRole('button', { name: 'Ver Gafa Sale' }));

        fireEvent.click(within(detalleAbierto()).getByText('Añadir al Carrito'));
        expect(JSON.parse(localStorage.getItem('carrito-lecco'))).toMatchObject([{ id: 3, name: 'Gafa Sale', price: 249 }]);

        fireEvent.click(screen.getByText('×'));
        expect(detalleAbierto()).toBeNull();
    });

    it('también se abre con el teclado (Enter)', async () => {
        renderInicio();
        const tarjeta = await screen.findByRole('button', { name: 'Ver Gafa Nueva' });
        fireEvent.keyDown(tarjeta, { key: 'Enter' });
        expect(detalleAbierto()).not.toBeNull();
    });

    it('arrastrar el carrusel no abre el detalle', async () => {
        renderInicio();
        const tarjeta = await screen.findByRole('button', { name: 'Ver Gafa Nueva' });
        const pista = tarjeta.parentElement;

        // happy-dom ignora pageX en el init del evento (siempre 0), así que se fija a mano
        const conPageX = (tipo, pageX) => {
            const evento = createEvent[tipo](pista);
            Object.defineProperty(evento, 'pageX', { value: pageX });
            fireEvent(pista, evento);
        };
        conPageX('mouseDown', 300);
        conPageX('mouseMove', 200); // 100px: es un arrastre, no un clic
        fireEvent.mouseUp(pista);
        fireEvent.click(tarjeta);

        expect(detalleAbierto()).toBeNull();
    });
});
