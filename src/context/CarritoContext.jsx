import { useState, useContext, createContext } from 'react'

export const CarritoContext = createContext()  //  crea el objeto del contexto 

export const useCarrito = () => useContext(CarritoContext)  /**  es un custom hook , en lugar de importa use context y crateContext , 
                                                                 llamas directamente a useCarrito();
                                                        

                                                                */
                                                        
        //funcion que gestiona el estado real del carrito 

export function CarritoProvider({ children }) {
    const [carrito, setCarrito] = useState([])   //memoria de mis componentes , renderiza el estado del carrito 

    const agregarAlCarrito = (producto) => {   //  es una fiuncion  toma la variable producto agregado 
        setCarrito(prev => {  // funcion que setea el carrio y aumente la cantidad cuando un producto se repita 
            const existenteProducto = prev.find(p => p.id === producto.id)  /**evalua  haciando la comparacion de un parametroy si sin */       
            
            if (existenteProducto) {    /*
                                    si encuentra una coincidencia entonces mapea el carrito donde coincide el cproducto     
                                     y evalua que si se parecen los producto entonces al arreglo producto le suma uno en cantidad 

                                    */
            return prev.map(p => 
                    p.id === producto.id ? { ...p, quantity: p.quantity + 1 } : p
                )
            }
            return [...prev, { ...producto, quantity: 1 }]
        })
    }

    const eliminarDelCarrito = (id) => {
        setCarrito(prev => prev.filter(p => p.id !== id))  /** utilizando la funcion setCarrito(),
                                                                con una funcion flecha define que el carrito es igual 
                                                                al filtrado sw loa peductos, manos del que coincida con el 
                                                                id del parametro  
        
                                                                */
    }
    

    const valorCarrito = { carrito, agregarAlCarrito, eliminarDelCarrito }

    return (
        <CarritoContext.Provider value={valorCarrito}>
            {children}
        </CarritoContext.Provider>
    )
}
