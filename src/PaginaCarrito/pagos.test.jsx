import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Carrito from './Carrito.jsx';
import { renderConProviders, renderRuta } from '../test/renderRuta.jsx';

const json = (data, ok = true, status = ok ? 200 : 404) => Promise.resolve({
    ok, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

// API simulada: `mercadopago` indica si el backend tiene MP configurado
const mockApi = ({ mercadopago }) => vi.fn((url) => {
    if (url === '/api/pedidos/metodos-pago') return json({ whatsapp: true, mercadopago });
    if (url === '/api/pedidos') return json({ pedido: { id: 77 }, initPoint: 'https://mp.test/checkout?pref_id=1' }, true, 201);
    return json({ error: 'No autorizado' }, false, 401);
});

const renderCarrito = () => renderConProviders(<Carrito />);

const llenarEnvio = () => {
    fireEvent.change(screen.getByPlaceholderText('Dirección completa'), { target: { value: 'Av. Sol 123' } });
    fireEvent.change(screen.getByPlaceholderText('Ciudad'), { target: { value: 'Lima' } });
    fireEvent.change(screen.getByPlaceholderText('C.P.'), { target: { value: '15001' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono'), { target: { value: '999999999' } });
};

describe('Checkout con dos métodos de pago', () => {
    let asignar;
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('carrito-lecco', JSON.stringify([{ id: 10, name: 'Gafa Playa', price: 150, quantity: 1, stock: 5 }]));
        asignar = vi.fn();
        vi.stubGlobal('location', { ...window.location, assign: asignar });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('sin Mercado Pago configurado solo se ofrece WhatsApp', async () => {
        globalThis.fetch = mockApi({ mercadopago: false });
        renderCarrito();
        fireEvent.click(await screen.findByText('Proceder al Pago'));
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith('/api/pedidos/metodos-pago'));
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();
        expect(screen.queryByText('Mercado Pago')).not.toBeInTheDocument();
    });

    it('con Mercado Pago envía metodoPago y redirige al checkout', async () => {
        globalThis.fetch = mockApi({ mercadopago: true });
        renderCarrito();
        fireEvent.click(await screen.findByText('Proceder al Pago'));
        fireEvent.click(await screen.findByLabelText(/Mercado Pago/));
        llenarEnvio();
        fireEvent.click(screen.getByText('Pagar con Mercado Pago'));

        await waitFor(() => expect(asignar).toHaveBeenCalledWith('https://mp.test/checkout?pref_id=1'));
        const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/pedidos');
        expect(JSON.parse(opciones.body).metodoPago).toBe('mercadopago');
    });
});

describe('Página de resultado de pago', () => {
    const renderResultado = (query) => renderRuta(`/pago/resultado${query}`);

    it('confirma el pago con el servidor y muestra "aprobado"', async () => {
        globalThis.fetch = vi.fn((url) => url === '/api/pedidos/pago/confirmar'
            ? json({ pedidoId: 77, estadoPago: 'aprobado', estado: 'procesando' })
            : json({}, false, 401));
        renderResultado('?payment_id=123&status=approved&external_reference=77');
        expect(await screen.findByText('¡Pago aprobado!')).toBeInTheDocument();
        const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/pedidos/pago/confirmar');
        expect(JSON.parse(opciones.body)).toEqual({ pagoId: '123' });
    });

    it('si el pago no se completó ofrece coordinar por WhatsApp', async () => {
        globalThis.fetch = vi.fn(() => json({}, false, 401));
        renderResultado('?payment_id=null&status=null&external_reference=77');
        expect(await screen.findByText('No se completó el pago')).toBeInTheDocument();
        expect(screen.getByText('Coordinar por WhatsApp').getAttribute('href')).toContain('pedido%20%2377');
    });
});
