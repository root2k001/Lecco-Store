import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';

const json = (data, ok = true) => Promise.resolve({
    ok, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

const UbicacionActual = () => <span data-testid="ruta">{useLocation().pathname}</span>;

const renderEn = (ruta) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[ruta]}>
            <App />
            <UbicacionActual />
        </MemoryRouter>
    </QueryClientProvider>
);

describe('Rutas de la tienda', () => {
    beforeEach(() => {
        localStorage.clear();
        globalThis.fetch = vi.fn((url) => {
            if (url.startsWith('/api/usuarios')) return json({ error: 'No autorizado' }, false);
            if (url.startsWith('/api/productos/colores')) return json([]);
            return json({ productos: [], total: 0, page: 1, totalPages: 1 });
        });
    });

    it('/Coleccion ya no existe: redirige a /Lentes y muestra todo el catálogo', async () => {
        renderEn('/Coleccion');
        expect(await screen.findByText('VER TODOS LOS PRODUCTOS')).toBeInTheDocument();
        expect(screen.getByTestId('ruta')).toHaveTextContent('/Lentes');
        const urls = globalThis.fetch.mock.calls.map(([url]) => url).filter(u => u.startsWith('/api/productos?'));
        expect(urls.some(u => u.includes('coleccion='))).toBe(false);
    });

    it('/Sale sigue pidiendo solo productos en oferta', async () => {
        renderEn('/Sale');
        await screen.findByText('VER TODOS LOS PRODUCTOS');
        const urls = globalThis.fetch.mock.calls.map(([url]) => url).filter(u => u.startsWith('/api/productos?'));
        expect(urls.every(u => u.includes('sale=true'))).toBe(true);
    });
});
