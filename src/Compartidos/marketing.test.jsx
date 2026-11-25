import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CarritoProvider } from '../context/CarritoContext';
import { FavoritosProvider } from '../context/FavoritosContext';
import AuthModal from './AuthModal/AuthModal.jsx';
import Footer from './footer/Footer.jsx';
import Perfil from '../PaginaPerfil/Perfil.jsx';

const json = (data, ok = true, status = ok ? 200 : 400) => Promise.resolve({
    ok, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(data)
});

const cuerpoDe = (ruta) => {
    const llamada = globalThis.fetch.mock.calls.find(([url]) => url === ruta);
    return llamada ? JSON.parse(llamada[1].body) : undefined;
};

const conProveedores = (ui) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
        <ToastProvider>
            <AuthProvider>
                <FavoritosProvider>
                    <CarritoProvider>{ui}</CarritoProvider>
                </FavoritosProvider>
            </AuthProvider>
        </ToastProvider>
    </MemoryRouter>
    </QueryClientProvider>
);

const campo = (etiqueta) => screen.getByText(etiqueta).parentElement.querySelector('input');

describe('Consentimiento de marketing en el registro', () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn((url) => {
            if (url === '/api/usuarios/me') return json({ error: 'No autorizado' }, false, 401);
            if (url === '/api/usuarios/refresh') return json({ error: 'No autorizado' }, false, 401);
            if (url === '/api/usuarios/registro') return json({ usuario: { id: 1 } }, true, 201);
            if (url === '/api/usuarios/login') return json({ usuario: { id: 1, nombre: 'Ana', aceptaMarketing: true } });
            return json({});
        });
    });

    const registrarse = async (marcarCasilla) => {
        conProveedores(<AuthModal onClose={() => {}} onSuccess={() => {}} />);
        fireEvent.click(screen.getByText('Regístrate aquí'));
        const casilla = screen.getByRole('checkbox');
        expect(casilla).not.toBeChecked(); // sin marcar por defecto
        if (marcarCasilla) fireEvent.click(casilla);
        fireEvent.change(campo('Nombre Completo'), { target: { value: 'Ana' } });
        fireEvent.change(campo('Correo Electrónico'), { target: { value: 'ana@test.local' } });
        fireEvent.change(campo('Contraseña'), { target: { value: 'Password123' } });
        fireEvent.click(screen.getByText('Registrarme'));
        await waitFor(() => expect(cuerpoDe('/api/usuarios/registro')).toBeDefined());
        return cuerpoDe('/api/usuarios/registro');
    };

    it('por defecto se registra SIN consentimiento', async () => {
        expect((await registrarse(false)).aceptaMarketing).toBe(false);
    });

    it('marcando la casilla envía aceptaMarketing=true', async () => {
        expect((await registrarse(true)).aceptaMarketing).toBe(true);
    });

    it('la casilla no aparece al iniciar sesión', () => {
        conProveedores(<AuthModal onClose={() => {}} onSuccess={() => {}} />);
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
});

describe('Newsletter del pie de página', () => {
    it('envía el correo y muestra el aviso de confirmación', async () => {
        globalThis.fetch = vi.fn(() => json({ message: 'Revisa tu correo y confirma tu suscripción.' }));
        render(<MemoryRouter><Footer /></MemoryRouter>);

        fireEvent.change(screen.getByLabelText('Recibe ofertas y nuevas colecciones'), { target: { value: 'lector@test.local' } });
        fireEvent.click(screen.getByText('Suscribirme'));

        expect(await screen.findByText('Revisa tu correo y confirma tu suscripción.')).toBeInTheDocument();
        expect(cuerpoDe('/api/newsletter')).toEqual({ email: 'lector@test.local' });
        expect(screen.getByLabelText('Recibe ofertas y nuevas colecciones')).toHaveValue('');
    });

    it('muestra el error si la suscripción no está disponible', async () => {
        globalThis.fetch = vi.fn(() => json({ error: 'La suscripción no está disponible en este momento.' }, false, 503));
        render(<MemoryRouter><Footer /></MemoryRouter>);

        fireEvent.change(screen.getByLabelText('Recibe ofertas y nuevas colecciones'), { target: { value: 'lector@test.local' } });
        fireEvent.click(screen.getByText('Suscribirme'));

        expect(await screen.findByText('La suscripción no está disponible en este momento.')).toBeInTheDocument();
    });
});

describe('Consentimiento en el perfil', () => {
    let usuario;
    beforeEach(() => {
        usuario = { id: 1, nombre: 'Ana', email: 'ana@test.local', rol: 'cliente', aceptaMarketing: false };
        globalThis.fetch = vi.fn((url, opciones = {}) => {
            if (url === '/api/usuarios/me') return json({ usuario });
            if (url === '/api/pedidos/mis-pedidos') return json([]);
            if (url === '/api/usuarios/perfil') {
                usuario = { ...usuario, ...JSON.parse(opciones.body) };
                return json({ usuario });
            }
            return json({});
        });
    });

    it('al recargar /perfil, los campos y la casilla muestran los datos reales del cliente', async () => {
        usuario.aceptaMarketing = true;
        conProveedores(<Perfil />);
        const casilla = await screen.findByRole('checkbox', { name: /Recibir ofertas/ });
        expect(casilla).toBeChecked();
        expect(campo('Nombre Completo')).toHaveValue('Ana');
        expect(campo('Correo Electrónico')).toHaveValue('ana@test.local');

        // Guardar sin tocar la casilla NO debe retirar el consentimiento
        fireEvent.click(screen.getByText('Guardar Cambios'));
        await screen.findByText('¡Tus datos se actualizaron correctamente!');
        expect(cuerpoDe('/api/usuarios/perfil')).not.toHaveProperty('aceptaMarketing');
    });

    it('activar la casilla envía aceptaMarketing; guardar sin cambiarla no lo envía', async () => {
        conProveedores(<Perfil />);
        const casilla = await screen.findByRole('checkbox', { name: /Recibir ofertas/ });
        expect(casilla).not.toBeChecked();

        fireEvent.click(screen.getByText('Guardar Cambios'));
        await screen.findByText('¡Tus datos se actualizaron correctamente!');
        expect(cuerpoDe('/api/usuarios/perfil')).not.toHaveProperty('aceptaMarketing');

        globalThis.fetch.mockClear();
        fireEvent.click(casilla);
        fireEvent.click(screen.getByText('Guardar Cambios'));
        await waitFor(() => expect(cuerpoDe('/api/usuarios/perfil')).toBeDefined());
        expect(cuerpoDe('/api/usuarios/perfil').aceptaMarketing).toBe(true);
    });
});
