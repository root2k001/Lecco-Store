import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock del fetch global
global.fetch = vi.fn();

const TestComponent = () => {
    const { usuario, isLoading, login, registro, logout, actualizarPerfil } = useAuth();

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <div data-testid="user">{usuario ? usuario.nombre : 'No User'}</div>
            <button onClick={() => login('test@test.com', 'password')}>Login</button>
            <button onClick={() => registro('Test', 'test@test.com', 'password')}>Registro</button>
            <button onClick={logout}>Logout</button>
            <button onClick={() => actualizarPerfil({ nombre: 'Nuevo Nombre' })}>Actualizar</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('inicia cargando y obtiene el usuario si hay sesion', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ usuario: { nombre: 'Juan' } }),
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe('Juan');
        });
        
        expect(global.fetch).toHaveBeenCalledWith('/api/usuarios/me', expect.any(Object));
    });

    it('maneja el refresco del token si falla me', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: false, headers: new Headers() }) // me falla
            .mockResolvedValueOnce({ ok: true, headers: new Headers() }) // refresh funciona
            .mockResolvedValueOnce({ 
                ok: true, 
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => ({ usuario: { nombre: 'Pedro' } }) 
            }); // me funciona despues de refresh

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe('Pedro');
        });
        
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('hace logout correctamente', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ usuario: { nombre: 'Juan' } }),
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe('Juan');
        });

        global.fetch.mockResolvedValueOnce({ ok: true, headers: new Headers() });

        screen.getByText('Logout').click();

        await waitFor(() => {
            expect(screen.getByTestId('user').textContent).toBe('No User');
        });
    });
});
