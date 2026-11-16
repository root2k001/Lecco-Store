import { useState, useEffect, useMemo } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import { useFavoritos } from '../../context/FavoritosContext';
import './Productos.css';
import DetalleProducto from '../DetallesProductos/DetallesProductos.jsx';

const COLORES_DISPONIBLES = [
    { id: 'negro', nombre: 'Negro', hex: '#111111' },
    { id: 'marron', nombre: 'Marrón / Carey', hex: '#6d4c41' },
    { id: 'dorado', nombre: 'Dorado', hex: '#d4af37' },
    { id: 'plateado', nombre: 'Plateado', hex: '#b0bec5' },
    { id: 'transparente', nombre: 'Transparente', hex: '#f8fafc', border: true },
    { id: 'azul', nombre: 'Azul', hex: '#1e88e5' },
    { id: 'rosa', nombre: 'Rosa / Púrpura', hex: '#d81b60' },
    { id: 'verde', nombre: 'Verde', hex: '#2e7d32' }
];

const ProductosList = () => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [orden, setOrden] = useState('relevante');
    const [colorSeleccionado, setColorSeleccionado] = useState(null);
    const [mostrarFiltrosMenu, setMostrarFiltrosMenu] = useState(false);

    // ── Paginación ──────────────────────────────────────────────────────────────
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalProductos, setTotalProductos] = useState(0);
    const ITEMS_POR_PAGINA = 12;
    // ───────────────────────────────────────────────────────────────────────────

    const { agregarAlCarrito } = useCarrito();
    const { toggleFavorito, esFavorito } = useFavoritos();

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/productos?page=${pagina}&limit=${ITEMS_POR_PAGINA}`);

                if (!response.ok) {
                    throw new Error('Error al cargar los productos desde el servidor');
                }

                const data = await response.json();
                const productosMapeados = (data.productos || data).map(p => ({
                    id: p.id,
                    name: p.nombre,
                    price: Number(p.precio),
                    img: p.imagen || 'en proceso',
                    gender: p.genero,
                    color: p.color ? String(p.color).trim().toLowerCase() : null,
                    stock: p.stock,
                    quantity: p.stock,
                    descripcion: p.descripcion,
                    imagenesAdicionales: p.imagenesAdicionales || [],
                    videos: p.videos || []
                }));
                setProductos(productosMapeados);
                if (data.totalPages !== undefined) {
                    setTotalPaginas(data.totalPages);
                    setTotalProductos(data.total);
                }
            } catch (err) {
                setError(err.message || 'Error al cargar los productos');
            } finally {
                setLoading(false);
            }
        };

        cargarProductos();
    }, [pagina]);

    const handleImageClick = (producto) => {
        setProductoSeleccionado(producto);
    };

    const handleCerrarModal = () => {
        setProductoSeleccionado(null);
    };

    const productosFiltrados = useMemo(() => {
        let resultado = [...productos];

        // Filtro estricto por color designado
        if (colorSeleccionado) {
            const buscado = colorSeleccionado.toLowerCase().trim();
            resultado = resultado.filter(producto => {
                if (!producto.color) return false;
                return producto.color === buscado || producto.color.includes(buscado);
            });
        }

        // Ordenamiento por precio
        if (orden === 'menor_mayor') {
            resultado = [...resultado].sort((a, b) => a.price - b.price);
        } else if (orden === 'mayor_menor') {
            resultado = [...resultado].sort((a, b) => b.price - a.price);
        }

        return resultado;
    }, [colorSeleccionado, orden, productos]);

    if (loading) {
        return (
            <section className='contenido'>
                <main className='collections'>
                    <div className="coleccion-header-seccion">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-subtitle"></div>
                    </div>
                    <div className="filtro-barra-horizontal">
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
        );
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
        );
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

                            <div className="filtro-divisor-secciones"></div>

                            <div className="filtro-seccion-colores">
                                <span>Color:</span>
                                <div className="opciones-color">
                                    <button
                                        className={`color-btn ${colorSeleccionado === null ? 'activo' : ''}`}
                                        onClick={() => setColorSeleccionado(null)}
                                    >
                                        Todos
                                    </button>
                                    {COLORES_DISPONIBLES.map((c) => (
                                        <button
                                            key={c.id}
                                            className={`color-btn ${colorSeleccionado === c.id ? 'activo' : ''}`}
                                            onClick={() => setColorSeleccionado(colorSeleccionado === c.id ? null : c.id)}
                                        >
                                            <span
                                                className="color-muestra"
                                                style={{
                                                    backgroundColor: c.hex,
                                                    border: c.border ? '1px solid #d1d5db' : 'none'
                                                }}
                                            />
                                            {c.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="productos">
                        {productosFiltrados.length === 0 ? (
                            <div className="no-resultados">
                                <span>🔍</span>
                                <p>No se encontraron productos con el color seleccionado</p>
                                <button
                                    className="btn-limpiar-filtros"
                                    onClick={() => setColorSeleccionado(null)}
                                >
                                    Ver todos los colores
                                </button>
                            </div>
                        ) : (
                            productosFiltrados.map((producto) => {
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
                                                        background: 'rgba(0, 0, 0, 0.75)',
                                                        color: '#fff',
                                                        padding: '4px 10px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '600',
                                                        letterSpacing: '1px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        Agotado
                                                    </div>
                                                )}
                                                {producto.videos && producto.videos.length > 0 && (
                                                    <div className="producto-badge-video" title="Incluye video">
                                                        ▶
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className='producto-info'>
                                            <div className="producto-header">
                                                <h3 className='producto-nombre'>{producto.name}</h3>
                                                <button
                                                    className={`btn-favorito ${esFavorito(producto.id) ? 'activo' : ''}`}
                                                    onClick={() => toggleFavorito(producto)}
                                                    title={esFavorito(producto.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
                                                >
                                                    <svg viewBox="0 0 24 24" className="bookmark-icono">
                                                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <p className='producto-precio'>S/ {producto.price.toLocaleString('es-PE')}</p>

                                            <div className="producto-acciones">
                                                <button
                                                    className='btn-agregar-carrito'
                                                    onClick={() => agregarAlCarrito(producto)}
                                                    disabled={producto.stock <= 0}
                                                >
                                                    {producto.stock <= 0 ? 'Sin Stock' : 'Añadir a la bolsa'}
                                                </button>
                                                <button
                                                    className='btn-ver-detalle'
                                                    onClick={() => handleImageClick(producto)}
                                                >
                                                    Detalle
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Controles de Paginación */}
                    {totalPaginas > 1 && (
                        <div className="paginacion-container">
                            <span className="paginacion-info">
                                Mostrando {((pagina - 1) * ITEMS_POR_PAGINA) + 1}–{Math.min(pagina * ITEMS_POR_PAGINA, totalProductos)} de {totalProductos} productos
                            </span>
                            <div className="paginacion-botones">
                                <button
                                    className="paginacion-btn"
                                    onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={pagina === 1}
                                >
                                    ← Anterior
                                </button>
                                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        className={`paginacion-numero ${n === pagina ? 'activo' : ''}`}
                                        onClick={() => { setPagina(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    className="paginacion-btn"
                                    onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={pagina === totalPaginas}
                                >
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </section>

            {productoSeleccionado && (
                <DetalleProducto
                    producto={productoSeleccionado}
                    onCerrar={handleCerrarModal}
                />
            )}
        </>
    );
};

export default ProductosList;
