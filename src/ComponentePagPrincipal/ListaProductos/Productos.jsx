import { useState, useEffect, useMemo } from 'react';
import { useCarrito } from '../../context/CarritoContext'
import { useFavoritos } from '../../context/FavoritosContext'
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
    const [mostrarFiltrosMenu, setMostrarFiltrosMenu] = useState(false)
    const { agregarAlCarrito } = useCarrito()
    const { toggleFavorito, esFavorito } = useFavoritos()

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await fetch('/api/productos')

                if (!response.ok) {
                    throw new Error('Error al cargar los productos desde el servidor')
                }

                const data = await response.json()
                // Mapeamos los datos del backend (español) al formato que tu frontend ya usaba (inglés)
                const productosMapeados = data.map(p => ({
                    id: p.id,
                    name: p.nombre,
                    price: Number(p.precio),
                    img: p.imagen || 'en proceso',
                    gender: p.genero,
                    stock: p.stock,
                    quantity: p.stock
                }))
                setProductos(productosMapeados)
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

    const handleCategoriaPill = (categoria) => {
        if (categoria === 'todo') {
            setFiltros({ hombre: false, mujer: false, unisex: false })
        } else {
            setFiltros({
                hombre: categoria === 'hombre',
                mujer: categoria === 'mujer',
                unisex: categoria === 'unisex'
            })
        }
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

    // A small list of colors to pick from for swatches to match Gentle Monster visual detail
    const mockSwatches = [
        ['#4b3c31', '#7d8c77'],
        ['#cfb53b', '#2e4a3f'],
        ['#1c1c1c', '#a8a8a8'],
        ['#d3a297', '#465c69']
    ]

    if (loading) {
        return (
            <section className='contenido'>
                <main className='collections'>
                    <div className="coleccion-header-seccion">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-subtitle"></div>
                    </div>
                    <div className="filtro-barra-horizontal">
                        <div className="skeleton-pills"></div>
                        <div className="skeleton-filter-btn"></div>
                    </div>
                    <div className="productos">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="producto-skeleton">
                                <div className="skeleton-imagen"></div>
                                <div className="skeleton-divider"></div>
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
                <main className='collections'>
                    <div className="coleccion-header-seccion">
                        <h1 className="coleccion-titulo">VER TODOS LOS PRODUCTOS</h1>
                        <p className="coleccion-subtitulo">
                            Descubre nuestra exclusiva colección de gafas con acabados de lujo para un estilo único.
                        </p>
                    </div>

                    <div className="filtro-barra-horizontal">
                        <div className="pildoras-categorias">
                            <button
                                className={`pildora-btn ${(!filtros.hombre && !filtros.mujer && !filtros.unisex) ? 'activo' : ''}`}
                                onClick={() => handleCategoriaPill('todo')}
                            >
                                Ver todo
                            </button>
                            <button
                                className={`pildora-btn ${filtros.hombre ? 'activo' : ''}`}
                                onClick={() => handleCategoriaPill('hombre')}
                            >
                                Para Él
                            </button>
                            <button
                                className={`pildora-btn ${filtros.mujer ? 'activo' : ''}`}
                                onClick={() => handleCategoriaPill('mujer')}
                            >
                                Para Ella
                            </button>
                            <button
                                className={`pildora-btn ${filtros.unisex ? 'activo' : ''}`}
                                onClick={() => handleCategoriaPill('unisex')}
                            >
                                Unisex
                            </button>
                        </div>

                        <button
                            className={`filtro-toggle-btn ${mostrarFiltrosMenu ? 'activo' : ''}`}
                            onClick={() => setMostrarFiltrosMenu(!mostrarFiltrosMenu)}
                        >
                            Filtro
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filtro-toggle-icono">
                                <line x1="4" y1="21" x2="4" y2="14" />
                                <line x1="4" y1="10" x2="4" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12" y2="3" />
                                <line x1="20" y1="21" x2="20" y2="16" />
                                <line x1="20" y1="12" x2="20" y2="3" />
                                <line x1="1" y1="14" x2="7" y2="14" />
                                <line x1="9" y1="8" x2="15" y2="8" />
                                <line x1="17" y1="16" x2="23" y2="16" />
                            </svg>
                        </button>
                    </div>

                    {mostrarFiltrosMenu && (
                        <div className="filtro-menu-desplegable">
                            <div className="filtro-seccion-ordenar">
                                <span>Ordenar por:</span>
                                <div className="opciones-orden">
                                    <button
                                        className={`orden-btn ${orden === 'relevante' ? 'activo' : ''}`}
                                        onClick={() => setOrden('relevante')}
                                    >
                                        Relevante
                                    </button>
                                    <button
                                        className={`orden-btn ${orden === 'menor_mayor' ? 'activo' : ''}`}
                                        onClick={() => setOrden('menor_mayor')}
                                    >
                                        Precio: Menor a Mayor
                                    </button>
                                    <button
                                        className={`orden-btn ${orden === 'mayor_menor' ? 'activo' : ''}`}
                                        onClick={() => setOrden('mayor_menor')}
                                    >
                                        Precio: Mayor a Menor
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="productos">
                        {productosFiltrados.length === 0 ? (
                            <div className="no-resultados">
                                <span>🔍</span>
                                <p>No se encontraron productos</p>
                                <button
                                    className="btn-limpiar-filtros"
                                    onClick={() => handleCategoriaPill('todo')}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : (
                            productosFiltrados.map((producto) => {
                                const swatches = mockSwatches[producto.id % mockSwatches.length]
                                return (
                                    <div className='producto-carta' key={producto.id}>
                                        <div className='producto-imagen-wrapper'>
                                            <div className='producto-imagen' onClick={() => handleImageClick(producto)}>
                                                {producto.img && producto.img !== 'en proceso' ?
                                                    <img src={producto.img} alt={producto.name} style={producto.stock <= 0 ? { opacity: 0.5 } : {}} /> :
                                                    <div className='imagen-placeholder'>👓</div>
                                                }
                                                {producto.stock <= 0 && (
                                                    <div className="producto-badge-agotado" style={{
                                                        position: 'absolute',
                                                        top: '15px',
                                                        left: '15px',
                                                        backgroundColor: 'rgba(254, 242, 242, 0.95)',
                                                        color: '#ef4444',
                                                        border: '1px solid #fca5a5',
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '2px',
                                                        zIndex: 2,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        Sin Stock
                                                    </div>
                                                )}
                                                <button
                                                    className={`btn-carrito-hover ${producto.stock <= 0 ? 'agotado' : ''}`}
                                                    disabled={producto.stock <= 0}
                                                    style={producto.stock <= 0 ? { backgroundColor: '#94a3b8', cursor: 'not-allowed', color: '#fff', transform: 'none' } : {}}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (producto.stock > 0) {
                                                            agregarAlCarrito(producto)
                                                        }
                                                    }}
                                                >
                                                    {producto.stock <= 0 ? 'Sin Stock' : 'Añadir al Carrito'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className='producto-detalles-info'>
                                            <div className='producto-divisor-linea'></div>

                                            <div className='producto-meta-fila'>
                                                <div className='producto-datos-principales'>
                                                    <h3 className='producto-nombre' onClick={() => handleImageClick(producto)}>{producto.name}</h3>
                                                    <p className='precio'>${producto.price.toLocaleString('es-CL')}</p>

                                                    <div className='producto-swatches'>
                                                        {swatches.map((color, idx) => (
                                                            <span
                                                                key={idx}
                                                                className='swatch-punto'
                                                                style={{ backgroundColor: color }}
                                                            ></span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    className={`btn-bookmark-guardar ${esFavorito(producto.id) ? 'activo' : ''}`}
                                                    onClick={() => toggleFavorito(producto)}
                                                    title={esFavorito(producto.id) ? "Quitar de favoritos" : "Guardar favorito"}
                                                >
                                                    <svg viewBox="0 0 24 24" className="bookmark-icono">
                                                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
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
