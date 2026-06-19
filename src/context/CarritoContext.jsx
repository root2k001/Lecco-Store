import { useState, useContext, createContext, useEffect } from 'react'
import { useToast } from './ToastContext'

export const CarritoContext = createContext()

export const useCarrito = () => useContext(CarritoContext)

export function CarritoProvider({ children }) {
    const { addToast } = useToast()

    const [carrito, setCarrito] = useState(() => {
        const guardando = localStorage.getItem('carrito-lecco')
        return guardando ? JSON.parse(guardando) : []
    })

    useEffect(() => {
        localStorage.setItem('carrito-lecco', JSON.stringify(carrito))
    }, [carrito])

    const agregarAlCarrito = (producto) => {
        let added = false;
        let noStock = false;

        setCarrito(prev => {
            const existenteProducto = prev.find(p => p.id === producto.id)
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
            addToast(`"${producto.nombre}" añadido al carrito`, 'success');
        } else if (noStock) {
            addToast(`No hay más stock disponible de "${producto.nombre}"`, 'error');
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

    const valorCarrito = { 
        carrito, 
        agregarAlCarrito, 
        eliminarDelCarrito,
        incrementarCantidad,
        decrementarCantidad,
        vaciarCarrito
    }

    return (
        <CarritoContext.Provider value={valorCarrito}> 
            {children}
        </CarritoContext.Provider>
    )
}
