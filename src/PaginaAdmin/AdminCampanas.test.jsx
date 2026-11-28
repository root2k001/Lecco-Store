import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminCampanas from './AdminCampanas.jsx';

const DIA = 24 * 60 * 60 * 1000;
const campana = (id, slug, titulo, desdeDias, hastaDias, activa = true) => ({
    id, slug, titulo, activa, descripcion: null, banner: null,
    inicio: new Date(Date.now() + desdeDias * DIA).toISOString(),
    fin: new Date(Date.now() + hastaDias * DIA).toISOString(),
    productos: [{ id: 10, nombre: 'Gafa Playa' }]
});

const json = (data, ok = true, status = ok ? 200 : 400) => Promise.resolve({
    ok, status, json: () => Promise.resolve(data)
});

let campanas;
const renderAdmin = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AdminCampanas />
    </QueryClientProvider>
);

describe('Panel admin: Campañas', () => {
    beforeEach(() => {
        campanas = [
            campana(1, 'verano-2027', 'Colección de Verano', -1, 30),
            campana(2, 'navidad', 'Navidad', 10, 40),
            campana(3, 'invierno', 'Invierno', -60, -30),
            campana(4, 'promo-pausada', 'Promo Pausada', -1, 5, false)
        ];
        globalThis.fetch = vi.fn((url, opciones = {}) => {
            if (url === '/api/campanas' && opciones.method === 'POST') {
                return json({ id: 5, ...JSON.parse(opciones.body), productos: [] }, true, 201);
            }
            if (url === '/api/campanas') return json(campanas);
            if (url.startsWith('/api/productos')) {
                return json({ productos: [{ id: 10, nombre: 'Gafa Playa', precio: '120.00' }, { id: 11, nombre: 'Gafa Oficina', precio: '200.00' }], totalPages: 1 });
            }
            return json({});
        });
    });

    it('lista las campañas con su estado según fechas y si están activas', async () => {
        renderAdmin();
        const fila = async (titulo) => (await screen.findByText(titulo)).closest('tr');
        expect(within(await fila('Colección de Verano')).getByText('Vigente')).toBeInTheDocument();
        expect(within(await fila('Navidad')).getByText('Programada')).toBeInTheDocument();
        expect(within(await fila('Invierno')).getByText('Finalizada')).toBeInTheDocument();
        expect(within(await fila('Promo Pausada')).getByText('Pausada')).toBeInTheDocument();
    });

    it('crea una campaña: sugiere el identificador y envía fechas y productos', async () => {
        renderAdmin();
        fireEvent.click(await screen.findByText('+ Nueva campaña'));

        fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Colección de Verano 2027' } });
        expect(screen.getByLabelText('Identificador (URL y utm_campaign)')).toHaveValue('coleccion-de-verano-2027');

        fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2026-12-01' } });
        fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2027-03-31' } });
        fireEvent.click(await screen.findByRole('checkbox', { name: /Gafa Playa/ }));
        fireEvent.click(screen.getByText('Guardar campaña'));

        await waitFor(() => expect(globalThis.fetch.mock.calls.some(([u, o]) => u === '/api/campanas' && o?.method === 'POST')).toBe(true));
        const [, opciones] = globalThis.fetch.mock.calls.find(([u, o]) => u === '/api/campanas' && o?.method === 'POST');
        const cuerpo = JSON.parse(opciones.body);
        expect(cuerpo).toMatchObject({ titulo: 'Colección de Verano 2027', slug: 'coleccion-de-verano-2027', activa: true, productoIds: [10] });
        // El inicio es el comienzo del día y el fin, el final del día (hora local)
        expect(new Date(cuerpo.inicio)).toEqual(new Date('2026-12-01T00:00:00'));
        expect(new Date(cuerpo.fin)).toEqual(new Date('2027-03-31T23:59:59'));
        await waitFor(() => expect(screen.queryByText('Nueva campaña')).not.toBeInTheDocument());
    });

    it('muestra el error del servidor sin cerrar el formulario', async () => {
        globalThis.fetch = vi.fn((url, opciones = {}) => {
            if (opciones.method === 'POST') return json({ error: 'Ya existe una campaña con ese identificador.' }, false, 409);
            if (url === '/api/campanas') return json(campanas);
            return json({ productos: [], totalPages: 1 });
        });
        renderAdmin();
        fireEvent.click(await screen.findByText('+ Nueva campaña'));
        fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Verano 2027' } });
        fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2026-12-01' } });
        fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2027-03-31' } });
        fireEvent.click(screen.getByText('Guardar campaña'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una campaña con ese identificador.');
        expect(screen.getByText('Nueva campaña')).toBeInTheDocument();
    });
});
