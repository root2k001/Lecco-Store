'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '../Compartidos/ErrorBoundary/ErrorBoundary.jsx';
import { CarritoProvider } from '../context/CarritoContext';
import { AuthProvider } from '../context/AuthContext';
import { FavoritosProvider } from '../context/FavoritosContext';
import { ToastProvider } from '../context/ToastContext';
import { capturarCampanaDeUrl } from '../utils/campanaOrigen.js';

// Estado global del cliente (antes en main.jsx y App.jsx)
// queryClient: solo lo pasan los tests (p. ej. sin reintentos)
export default function Providers({ children, queryClient: clienteExterno }) {
    // Un QueryClient por navegador (en el servidor, uno por petición)
    const [queryClient] = useState(() => clienteExterno ?? new QueryClient());

    // Guarda el utm_campaign de los enlaces de Brevo para atribuir la venta a la campaña
    useEffect(() => {
        capturarCampanaDeUrl();
    }, []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <AuthProvider>
                        <FavoritosProvider>
                            <CarritoProvider>
                                {children}
                            </CarritoProvider>
                        </FavoritosProvider>
                    </AuthProvider>
                </ToastProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
