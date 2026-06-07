import { createContext, useState, useContext, useEffect } from 'react';

const FavoritosContext = createContext();

export const useFavoritos = () => useContext(FavoritosContext);

export function FavoritosProvider({ children }) {
    // Cargamos los favoritos desde LocalStorage al iniciar
    const [favoritos, setFavoritos] = useState(() => {
        const guardado = localStorage.getItem('lecco-favoritos');
        return guardado ? JSON.parse(guardado) : {};
    });

    // Guardamos en LocalStorage cada vez que cambian los favoritos
    useEffect(() => {
        localStorage.setItem('lecco-favoritos', JSON.stringify(favoritos));
    }, [favoritos]);

    // Recibe el objeto producto completo para poder mostrarlo en el carrusel
    const toggleFavorito = (producto) => {
        setFavoritos(prev => {
            if (prev[producto.id]) {
                // Si ya existe, lo eliminamos
                const { [producto.id]: _, ...resto } = prev;
                return resto;
            } else {
                // Si no existe, lo añadimos con todos sus datos
                return { ...prev, [producto.id]: producto };
            }
        });
    };

    const esFavorito = (id) => Boolean(favoritos[id]);

    const listaFavoritos = Object.values(favoritos);

    return (
        <FavoritosContext.Provider value={{ favoritos, toggleFavorito, esFavorito, listaFavoritos }}>
            {children}
        </FavoritosContext.Provider>
    );
}
