'use client';

import { createContext, useContext, useMemo, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useEstadoPersistente } from '../lib/useEstadoPersistente.js';

const FavoritosContext = createContext();

export const useFavoritos = () => {
    const context = useContext(FavoritosContext);
    if (context === undefined) {
        throw new Error('useFavoritos debe usarse dentro de un FavoritosProvider');
    }
    return context;
};

    export function FavoritosProvider({ children }) {
    const { addToast } = useToast();

    // Favoritos guardados en LocalStorage (se cargan tras montar, compatible con SSR)
    const [favoritos, setFavoritos] = useEstadoPersistente('lecco-favoritos', {});

    // Recibe el objeto producto completo para poder mostrarlo en el carrusel
    const toggleFavorito = useCallback((producto) => {
        // Se decide con el estado actual: React no garantiza ejecutar el updater de
        // setFavoritos al instante, así que no se puede leer un flag puesto dentro
        // (provocaba "eliminado de favoritos" al volver a guardar un producto).
        const yaEsFavorito = Boolean(favoritos[producto.id]);

        setFavoritos(prev => {
            if (yaEsFavorito) {
                // Si ya existe, lo eliminamos
                const { [producto.id]: _, ...resto } = prev;
                return resto;
            }
            // Si no existe, lo añadimos con todos sus datos
            return { ...prev, [producto.id]: producto };
        });

        // El catálogo mapea el nombre a `name`; otros componentes usan `nombre`
        const nombre = producto.nombre || producto.name || 'Producto';
        if (yaEsFavorito) {
            addToast(`"${nombre}" eliminado de favoritos`, 'info');
        } else {
            addToast(`"${nombre}" guardado en favoritos`, 'info');
        }
    }, [favoritos, addToast, setFavoritos]);

    const esFavorito = useCallback((id) => Boolean(favoritos[id]), [favoritos]);

    const listaFavoritos = useMemo(() => Object.values(favoritos), [favoritos]);

    const valorFavoritos = useMemo(() => ({
        favoritos,
        toggleFavorito,
        esFavorito,
        listaFavoritos
    }), [favoritos, listaFavoritos, toggleFavorito, esFavorito]);

    return (
        <FavoritosContext.Provider value={valorFavoritos}>
            {children}
        </FavoritosContext.Provider>
    );
}
