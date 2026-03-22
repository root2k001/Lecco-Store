import { useState, useEffect, useMemo } from 'react';
import { useCarrito } from '../../context/CarritoContext'
import './Productos.css'
import DetalleProducto from '../DetallesProductos/DetallesProductos.jsx'

const ProductosList = () => {
    const [productos, setProductos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [productoSeleccionado, setProductoSeleccionado] = useState(null)
    const [filtros, setFiltros] = useState({
        hombre: false,
        mujer: false,
        unisex: false
    })
    const [orden, setOrden] = useState('relevante')
    const { agregarAlCarrito } = useCarrito()

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await fetch('/data.json')
                
                if (!response.ok) {
                    throw new Error('Error al cargar los productos')
                }
                
                const data = await response.json()
                setProductos(data)
            } catch (err) {
                setError(err.message || 'Error al cargar los productos')
            } finally {
                setLoading(false)
            }
        }

        cargarProductos()
    }, [])

    const handleImageClick = (producto) => {
        setProductoSeleccionado(producto)
    }

    const handleCerrarModal = () => {
        setProductoSeleccionado(null)
    }

    const handleFiltroChange = (genero) => {
        setFiltros(prev => ({
            ...prev,
            [genero]: !prev[genero]
        }))
    }

    const handleOrdenChange = (e) => {
        setOrden(e.target.value)
    }

    const productosFiltrados = useMemo(() => {
        let resultado = [...productos]

        const generosSeleccionados = Object.keys(filtros).filter(key => filtros[key])

        if (generosSeleccionados.length > 0) {
            resultado = resultado.filter(producto => 
                generosSeleccionados.includes(producto.gender)
            )
        }

        if (orden === 'menor_mayor') {
            resultado = [...resultado].sort((a, b) => a.price - b.price)
        } else if (orden === 'mayor_menor') {
            resultado = [...resultado].sort((a, b) => b.price - a.price)
        }

        return resultado
    }, [filtros, orden, productos])

    if (loading) {
        return (
            <section className='contenido'>
                <aside className='filtros'>
                    <h2>Filtros</h2>
                    <div className='filtros-categoria'>
                        <h3>Género</h3>
                        <div className="skeleton-checkbox"></div>
                        <div className="skeleton-checkbox"></div>
                        <div className="skeleton-checkbox"></div>
                    </div>
                </aside>
                <main className='collections'>
                    <h2>TODAS LAS COLECCIONES</h2>
                    <div className="productos-loading">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="producto-skeleton">
                                <div className="skeleton-imagen"></div>
                                <div className="skeleton-texto"></div>
                                <div className="skeleton-texto corto"></div>
                            </div>
                        ))}
                    </div>
                </main>
            </section>
        )
    }

    if (error) {
        return (
            <section className='contenido'>
                <aside className='filtros'>
                    <h2>Filtros</h2>
                </aside>
                <main className='collections'>
                    <div className="productos-error">
                        <span className="error-icono">⚠️</span>
                        <h3>Algo salió mal</h3>
                        <p>{error}</p>
                        <button 
                            className="btn-reintentar"
                            onClick={() => window.location.reload()}
                        >
                            Reintentar
                        </button>
                    </div>
                </main>
            </section>
        )
    }

    return (
        <>
            <section className='contenido'>
                <aside className='filtros'>
                    <h2>Filtros</h2>
                    <div className='filtros-categoria'>
                        <h3>Género</h3>
                        <label>
                            <input 
                                type='checkbox' 
                                checked={filtros.hombre}    
                                onChange={() => handleFiltroChange('hombre')}
                            />
                            <span>Para Él</span>
                        </label>
                        <label>
                            <input 
                                type='checkbox'
                                checked={filtros.mujer}
                                onChange={() => handleFiltroChange('mujer')}
                            />
                            <span>Para Ella</span>
                        </label>
                        <label>
                            <input 
                                type='checkbox'
                                checked={filtros.unisex}
                                onChange={() => handleFiltroChange('unisex')}
                            />
                            <span>Unisex</span>
                        </label>
                    </div>
                </aside>

                <main className='collections'>      
                    <h2>TODAS LAS COLECCIONES</h2>
                    <div className="ordenar">
                        <label>
                            Ordenar por:
                            <select value={orden} onChange={handleOrdenChange}>
                                <option value="relevante">Relevante</option>
                                <option value="menor_mayor">Precio: Menor a Mayor</option>
                                <option value="mayor_menor">Precio: Mayor a Menor</option>
                            </select>
                        </label>
                    </div>

                    <div className="productos">
                        {productosFiltrados.length === 0 ? (
                            <div className="no-resultados">
                                <span>🔍</span>
                                <p>No se encontraron productos</p>
                                <button 
                                    className="btn-limpiar-filtros"
                                    onClick={() => setFiltros({ hombre: false, mujer: false, unisex: false })}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : (
                            productosFiltrados.map((producto) => (
                                <div className='producto-carta' key={producto.id}>
                                    <div className='producto-imagen' onClick={() => handleImageClick(producto)}>
                                        {producto.img && producto.img !== 'en proceso' ?   
                                            <img src={producto.img} alt={producto.name} /> : 
                                            <div className='imagen-placeholder'>👓</div>
                                        }
                                    </div>
                                    <span className='genero-tag'>{producto.gender}</span>
                                    <h3>{producto.name}</h3>
                                    <p className='precio'>${producto.price}</p>
                                    <button 
                                        className='btn-carrito' 
                                        onClick={() => agregarAlCarrito(producto)}
                                    >
                                        Añadir al Carrito
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </section>

            {productoSeleccionado && (
                <DetalleProducto 
                    producto={productoSeleccionado} 
                    onCerrar={handleCerrarModal} 
                />
            )}
        </>
    )
}

export default ProductosList;
