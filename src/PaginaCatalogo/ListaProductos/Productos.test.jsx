import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../context/ToastContext';
import { CarritoProvider } from '../../context/CarritoContext';
import { FavoritosProvider } from '../../context/FavoritosContext';
import Productos from './Productos.jsx';

const productoApi = (id, nombre, extra = {}) => ({
    id, nombre, precio: '199.90', imagen: null, genero: 'unisex', color: 'Negro', stock: 3, ...extra
});

const respuesta = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

// Simula la API: /colores y /productos (con o sin ?sale=true)
const mockFetch = () => vi.fn((url) => {
    if (url.startsWith('/api/productos/colores')) return respuesta(['Negro']);
    const sale = new URL(url, 'http://x').searchParams.get('sale') === 'true';
    const productos = sale
        ? [productoApi(1, 'Gafa en Oferta')]
        : [productoApi(1, 'Gafa en Oferta'), productoApi(2, 'Gafa Normal')];
    return respuesta({ productos, total: productos.length, page: 1, totalPages: 1, limit: 16 });
});

const renderCatalogo = (props = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <FavoritosProvider>
                    <CarritoProvider>
                        <Productos {...props} />
                    </CarritoProvider>
                </FavoritosProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
};

const urlsDeProductos = () => globalThis.fetch.mock.calls
    .map(([url]) => url)
    .filter(url => url.startsWith('/api/productos?'));

describe('Catálogo de productos', () => {
    beforeEach(() => {
        localStorage.clear();
        globalThis.fetch = mockFetch();
    });

    it('en /Sale pide solo productos en oferta (?sale=true)', async () => {
        renderCatalogo({ sale: true });
        expect(await screen.findByText('Gafa en Oferta')).toBeInTheDocument();
        expect(screen.queryByText('Gafa Normal')).not.toBeInTheDocument();
        expect(urlsDeProductos().every(url => url.includes('sale=true'))).toBe(true);
    });

    it('en /Lentes no filtra por oferta ni por colección', async () => {
        renderCatalogo();
        expect(await screen.findByText('Gafa Normal')).toBeInTheDocument();
        expect(urlsDeProductos().some(url => url.includes('sale=') || url.includes('coleccion='))).toBe(false);
    });

    it('muestra el precio y permite añadir a la bolsa', async () => {
        renderCatalogo({ sale: true });
        expect(await screen.findByText(/S\/ 199[.,]9/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Añadir a la bolsa'));
        expect(screen.getByText('Producto añadido al carrito')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('carrito-lecco'))).toHaveLength(1);
    });

    it('muestra un error si la API falla', async () => {
        globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
        renderCatalogo();
        expect(await screen.findByText('Error al cargar los productos desde el servidor')).toBeInTheDocument();
    });
});
