import { useState, useEffect, useMemo } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import { useFavoritos } from '../../context/FavoritosContext';
import './Productos.css';
import DetalleProducto from '../DetallesProductos/DetallesProductos.jsx';

// Diccionario de referencia para muestras visuales de colores habituales
const DICCIONARIO_COLORES_HEX = {
    negro: '#111111',
    black: '#111111',
    blanco: '#ffffff',
    white: '#ffffff',
    transparente: '#f8fafc',
    transparentes: '#f8fafc',
    cristal: '#f8fafc',
    marron: '#6d4c41',
    marrón: '#6d4c41',
    brown: '#6d4c41',
    carey: '#5c3a21',
    habana: '#5c3a21',
    tortoise: '#5c3a21',
    ambar: '#ffbf00',
    ámbar: '#ffbf00',
    dorado: '#d4af37',
    oro: '#d4af37',
    gold: '#d4af37',
    plateado: '#b0bec5',
    plata: '#b0bec5',
    silver: '#b0bec5',
    gris: '#757575',
    gray: '#757575',
    grey: '#757575',
    azul: '#1e88e5',
    blue: '#1e88e5',
    navy: '#0d47a1',
    celeste: '#4fc3f7',
    rosa: '#d81b60',
    rosado: '#d81b60',
    pink: '#d81b60',
    purpura: '#8e24aa',
    púrpura: '#8e24aa',
    morado: '#7b1fa2',
    violeta: '#7b1fa2',
    rojo: '#e53935',
    red: '#e53935',
    verde: '#2e7d32',
    green: '#2e7d32',
    oliva: '#556b2f',
    amarillo: '#fbc02d',
    yellow: '#fbc02d',
    naranja: '#fb8c00',
    orange: '#fb8c00',
    beige: '#f5f5dc'
};

const ProductosList = ({ sale = false }) => {
    const [productos, setProductos] = useState([]);
    const [coloresBD, setColoresBD] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [orden, setOrden] = useState('relevante');
    const [colorSeleccionado, setColorSeleccionado] = useState(null);
    const [mostrarFiltrosMenu, setMostrarFiltrosMenu] = useState(false);

    // ── Paginación (16 productos por página) ───────────────────────────────────
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalProductos, setTotalProductos] = useState(0);
    const ITEMS_POR_PAGINA = 16;
    // ───────────────────────────────────────────────────────────────────────────

    const { agregarAlCarrito } = useCarrito();
    const { toggleFavorito, esFavorito } = useFavoritos();

    // Cargar todos los colores únicos existentes en la BD una sola vez
    useEffect(() => {
        const cargarColores = async () => {
            try {
                const res = await fetch('/api/productos/colores');
                if (res.ok) {
                    const listaColores = await res.json();
                    setColoresBD(listaColores);
                }
            } catch (err) {
                console.error('Error cargando lista de colores:', err);
            }
        };
        cargarColores();
    }, []);

    // Cargar productos paginados, filtrados y ordenados desde el servidor
    useEffect(() => {
        const cargarProductos = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams({
                    page: String(pagina),
                    limit: String(ITEMS_POR_PAGINA),
                    orden
                });

                if (colorSeleccionado) {
                    params.append('color', colorSeleccionado);
                }

                // En la pestaña /Sale solo se piden productos en oferta
                if (sale) {
                    params.append('sale', 'true');
                }

                const response = await fetch(`/api/productos?${params.toString()}`);

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
                    color: p.color ? String(p.color).trim() : null,
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
    }, [pagina, colorSeleccionado, orden, sale]);

    // Formatear colores únicos sin duplicar por mayúsculas/minúsculas
    const coloresDisponibles = useMemo(() => {
        const mapa = new Map();
        coloresBD.forEach(c => {
            if (c && typeof c === 'string' && c.trim()) {
                const clave = c.trim().toLowerCase();
                if (!mapa.has(clave)) {
                    const textoOriginal = c.trim();
                    const nombreFormateado = textoOriginal.charAt(0).toUpperCase() + textoOriginal.slice(1).toLowerCase();
                    mapa.set(clave, {
                        id: clave,
                        nombre: nombreFormateado,
                        hex: DICCIONARIO_COLORES_HEX[clave] || '#64748b',
                        border: clave === 'blanco' || clave === 'transparente' || clave === 'transparentes' || clave === 'cristal'
                    });
                }
            }
        });
        return Array.from(mapa.values());
    }, [coloresBD]);

    // Handlers que reinician la paginación a la página 1 al filtrar u ordenar
    const manejarCambioOrden = (nuevoOrden) => {
        setOrden(nuevoOrden);
        setPagina(1);
    };

    const manejarSeleccionColor = (nuevoColorId) => {
        setColorSeleccionado(prev => (prev === nuevoColorId ? null : nuevoColorId));
        setPagina(1);
    };

    const handleImageClick = (producto) => {
        setProductoSeleccionado(producto);
    };

    const handleCerrarModal = () => {
        setProductoSeleccionado(null);
    };

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
                                        onClick={() => manejarCambioOrden('relevante')}
                                    >
                                        Relevante
                                    </button>
                                    <button
                                        className={`orden-btn ${orden === 'menor_mayor' ? 'activo' : ''}`}
                                        onClick={() => manejarCambioOrden('menor_mayor')}
                                    >
                                        Precio: Menor a Mayor
                                    </button>
                                    <button
                                        className={`orden-btn ${orden === 'mayor_menor' ? 'activo' : ''}`}
                                        onClick={() => manejarCambioOrden('mayor_menor')}
                                    >
                                        Precio: Mayor a Menor
                                    </button>
                                </div>
                            </div>

                            {/* Sección dinámica de colores */}
                            {coloresDisponibles.length > 0 && (
                                <>
                                    <div className="filtro-divisor-secciones"></div>

                                    <div className="filtro-seccion-colores">
                                        <span>Color:</span>
                                        <div className="opciones-color">
                                            <button
                                                className={`color-btn ${colorSeleccionado === null ? 'activo' : ''}`}
                                                onClick={() => { setColorSeleccionado(null); setPagina(1); }}
                                            >
                                                Todos
                                            </button>
                                            {coloresDisponibles.map((c) => (
                                                <button
                                                    key={c.id}
                                                    className={`color-btn ${colorSeleccionado === c.id ? 'activo' : ''}`}
                                                    onClick={() => manejarSeleccionColor(c.id)}
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
                                </>
                            )}
                        </div>
                    )}

                    <div className="productos">
                        {productos.length === 0 ? (
                            <div className="no-resultados">
                                <span>🔍</span>
                                <p>No se encontraron productos con el color seleccionado</p>
                                <button
                                    className="btn-limpiar-filtros"
                                    onClick={() => { setColorSeleccionado(null); setPagina(1); }}
                                >
                                    Ver todos los colores
                                </button>
                            </div>
                        ) : (
                            productos.map((producto) => {
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
                                                <div className="producto-acciones">
                                                    <button
                                                        className='btn-agregar-carrito'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (producto.stock > 0) {
                                                                agregarAlCarrito(producto);
                                                            }
                                                        }}
                                                        disabled={producto.stock <= 0}
                                                    >
                                                        {producto.stock <= 0 ? 'Sin Stock' : 'Añadir a la bolsa'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='producto-info'>
                                            <div className="producto-header">
                                                <h3 className='producto-nombre' onClick={() => handleImageClick(producto)}>{producto.name}</h3>
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

