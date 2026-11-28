'use client'

import { useContext, createContext, useMemo, useCallback } from 'react'
import { useToast } from './ToastContext'
import { useEstadoPersistente } from '../lib/useEstadoPersistente.js'

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

    // Carrito guardado en el localStorage del navegador (se carga tras montar, compatible con SSR)
    const [carrito, setCarrito] = useEstadoPersistente('carrito-lecco', [])

    const agregarAlCarrito = useCallback((producto) => {
        // El aviso se decide con el carrito actual: React no garantiza ejecutar el
        // updater de setCarrito al instante, así que no se puede leer un flag puesto dentro.
        const maxStockActual = producto.stock !== undefined ? producto.stock : (producto.quantity !== undefined ? producto.quantity : Infinity)
        const cantidadActual = carrito.find(p => p.id === producto.id)?.quantity ?? 0
        if (cantidadActual >= maxStockActual) {
            addToast('No hay más stock disponible', 'error');
            return
        }

        //funcion que setea el nuevo estado del carrito (vuelve a validar el stock por seguridad)
        setCarrito(prev => {
            //constante  de validacion para  revisar si el  producto  ya  esta en el  carrito
            const existenteProducto = prev.find(p => p.id === producto.id)
            //constante  de stock que revisa  si el  producto  tiene stock o cantidad disponible
            const maxStock = producto.stock !== undefined ? producto.stock : (producto.quantity !== undefined ? producto.quantity : Infinity)

            if (existenteProducto) {
                if (existenteProducto.quantity >= maxStock) {
                    return prev
                }
                return prev.map(p =>
                    p.id === producto.id ? { ...p, quantity: p.quantity + 1 } : p
                )
            }

            if (maxStock <= 0) {
                return prev
            }

            return [...prev, { ...producto, quantity: 1, stock: maxStock }]
        });

        addToast('Producto añadido al carrito', 'success');
    }, [carrito, addToast, setCarrito])

    const eliminarDelCarrito = useCallback((id) => {
        setCarrito(prev => prev.filter(p => p.id !== id))
        addToast('Producto eliminado del carrito', 'info')
    }, [addToast, setCarrito])

    const incrementarCantidad = useCallback((id) => {
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
    }, [setCarrito])

    const decrementarCantidad = useCallback((id) => {
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
    }, [setCarrito])

    const vaciarCarrito = useCallback(() => {
        setCarrito([])
    }, [setCarrito])

    const valorCarrito = useMemo(() => ({
        carrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        incrementarCantidad,
        decrementarCantidad,
        vaciarCarrito
    }), [carrito, agregarAlCarrito, eliminarDelCarrito, incrementarCantidad, decrementarCantidad, vaciarCarrito])

    return (
        <CarritoContext.Provider value={valorCarrito}>
            {children}
        </CarritoContext.Provider>
    )
}
