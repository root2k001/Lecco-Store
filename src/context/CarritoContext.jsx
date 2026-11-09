import { useState, useContext, createContext, useEffect, useMemo } from 'react'
import { useToast } from './ToastContext'

export const CarritoContext = createContext()

export const useCarrito = () => {
    const context = useContext(CarritoContext);
    if (context === undefined) {
        throw new Error('useCarrito debe usarse dentro de un CarritoProvider');
    }
    return context;
}

export function CarritoProvider({ children }) {
    const { addToast } = useToast()

    // revisa  si hay compras  previas  guardadas  en el localstorage del navegador
    const [carrito, setCarrito] = useState(() => {
        try {
            const guardando = localStorage.getItem('carrito-lecco')
            return guardando ? JSON.parse(guardando) : []
        } catch {
            return []
        }
    })

    // cada vez que  cambia  el carrito  se  actualiza el  localstorage
    useEffect(() => {
        localStorage.setItem('carrito-lecco', JSON.stringify(carrito))
    }, [carrito])

    const agregarAlCarrito = (producto) => {
        let added = false;
        let noStock = false;

        //funcion que setea el nuevo estado del carrito
        setCarrito(prev => {
            //constante  de validacion para  revisar si el  producto  ya  esta en el  carrito
            const existenteProducto = prev.find(p => p.id === producto.id)
            //constante  de stock que revisa  si el  producto  tiene stock o cantidad disponible
            const maxStock = producto.stock !== undefined ? producto.stock : (producto.quantity !== undefined ? producto.quantity : Infinity)

            if (existenteProducto) {
                if (existenteProducto.quantity >= maxStock) {
                    noStock = true;
                    return prev
                }
                added = true;
                return prev.map(p =>
                    p.id === producto.id ? { ...p, quantity: p.quantity + 1 } : p
                )
            }

            if (maxStock <= 0) {
                noStock = true;
                return prev
            }

            added = true;
            return [...prev, { ...producto, quantity: 1, stock: maxStock }]
        });

        if (added) {
            addToast('Producto añadido al carrito', 'success');
        } else if (noStock) {
            addToast('No hay más stock disponible', 'error');
        }
    }

    const eliminarDelCarrito = (id) => {
        setCarrito(prev => prev.filter(p => p.id !== id))
        addToast('Producto eliminado del carrito', 'info')
    }

    const incrementarCantidad = (id) => {
        setCarrito(prev =>
            prev.map(p => {
                if (p.id === id) {
                    const maxStock = p.stock !== undefined ? p.stock : Infinity
                    if (p.quantity >= maxStock) {
                        return p
                    }
                    return { ...p, quantity: p.quantity + 1 }
                }
                return p
            })
        )
    }

    const decrementarCantidad = (id) => {
        setCarrito(prev =>
            prev.map(p => {
                if (p.id === id) {
                    if (p.quantity > 1) {
                        return { ...p, quantity: p.quantity - 1 }
                    }
                }
                return p
            }).filter(p => p.quantity > 0)
        )
    }

    const vaciarCarrito = () => {
        setCarrito([])
    }

    const valorCarrito = useMemo(() => ({
        carrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        incrementarCantidad,
        decrementarCantidad,
        vaciarCarrito
    }), [carrito])

    return (
        <CarritoContext.Provider value={valorCarrito}>
            {children}
        </CarritoContext.Provider>
    )
}
