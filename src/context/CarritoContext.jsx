import { useState, useContext, createContext, useEffect } from 'react'

export const CarritoContext = createContext()

export const useCarrito = () => useContext(CarritoContext)

export function CarritoProvider({ children }) {
    const [carrito, setCarrito] = useState(() => {
        const guardando = localStorage.getItem('carrito-lecco')
        return guardando ? JSON.parse(guardando) : []
    })

    useEffect(() => {
        localStorage.setItem('carrito-lecco', JSON.stringify(carrito))
    }, [carrito])

    const agregarAlCarrito = (producto) => {
        setCarrito(prev => {
            const existenteProducto = prev.find(p => p.id === producto.id)
            
            if (existenteProducto) {
                return prev.map(p => 
                    p.id === producto.id ? { ...p, quantity: p.quantity + 1 } : p
                )
            }
            return [...prev, { ...producto, quantity: 1 }]
        })
    }

    const eliminarDelCarrito = (id) => {
        setCarrito(prev => prev.filter(p => p.id !== id))
    }

    const incrementarCantidad = (id) => {
        setCarrito(prev => 
            prev.map(p => 
                p.id === id ? { ...p, quantity: p.quantity + 1 } : p
            )
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
