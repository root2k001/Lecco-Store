import { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useToast } from './ToastContext';

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

    // Cargamos los favoritos desde LocalStorage al iniciar
    const [favoritos, setFavoritos] = useState(() => {
        try {
            const guardado = localStorage.getItem('lecco-favoritos');
            return guardado ? JSON.parse(guardado) : {};
    
        } catch {
            return {};
        }

    });

    // Guardamos en LocalStorage cada vez que cambian los favoritos
    useEffect(() => {
        localStorage.setItem('lecco-favoritos', JSON.stringify(favoritos));
    }, [favoritos]);

    // Recibe el objeto producto completo para poder mostrarlo en el carrusel
    const toggleFavorito = (producto) => {
        let isAdded = false;
        
        setFavoritos(prev => {
            if (prev[producto.id]) {
                // Si ya existe, lo eliminamos
                const { [producto.id]: _, ...resto } = prev;
                return resto;
            } else {
                // Si no existe, lo añadimos con todos sus datos
                isAdded = true;
                return { ...prev, [producto.id]: producto };
            }
        });

        if (isAdded) {
            addToast(`"${producto.nombre}" guardado en favoritos`, 'info');
        } else {
            addToast(`"${producto.nombre}" eliminado de favoritos`, 'info');
        }
    };

    const esFavorito = (id) => Boolean(favoritos[id]);

    const listaFavoritos = useMemo(() => Object.values(favoritos), [favoritos]);

    const valorFavoritos = useMemo(() => ({
        favoritos,
        toggleFavorito,
        esFavorito,
        listaFavoritos
    }), [favoritos, listaFavoritos]);

    return (
        <FavoritosContext.Provider value={valorFavoritos}>
            {children}
        </FavoritosContext.Provider>
    );
}
