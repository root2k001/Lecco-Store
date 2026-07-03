import './Detalles.css'
import { useCarrito } from '../../context/CarritoContext'
import { useFavoritos } from '../../context/FavoritosContext'
import { useState } from 'react'

const DetalleProducto = ({ producto, onCerrar }) => {
    const { agregarAlCarrito } = useCarrito()
    const { toggleFavorito, esFavorito } = useFavoritos()

    // Estados para controlar los acordeones
    const [envioAbierto, setEnvioAbierto] = useState(false)
    const [detallesAbierto, setDetallesAbierto] = useState(true)

    if (!producto) return null

    const imagenesAdicionales = producto.imagenesAdicionales || []
    const videosProducto = producto.videos || []

    const mediaList = [
        ...(producto.img && producto.img !== 'en proceso' ? [{ type: 'image', url: producto.img }] : []),
        ...imagenesAdicionales.map(url => ({ type: 'image', url })),
        ...videosProducto.map(url => ({ type: 'video', url }))
    ]

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-cerrar" onClick={onCerrar}>×</button>

                <div className="detalle-producto-container">
                    {/* Columna Izquierda: Carrusel de imágenes/videos scrolleable verticalmente */}
                    <div className="detalle-imagenes-carrusel">
                        {mediaList.length > 0 ? (
                            mediaList.map((item, index) => (
                                <div className="carrusel-imagen-wrapper" key={index}>
                                    {item.type === 'image' ? (
                                        <img
                                            src={item.url}
                                            alt={`${producto.name} - Vista ${index + 1}`}
                                            style={producto.stock <= 0 ? { opacity: 0.6 } : {}}
                                        />
                                    ) : (
                                        <video
                                            src={item.url}
                                            controls
                                            muted
                                            loop
                                            playsInline
                                            style={producto.stock <= 0 ? { opacity: 0.6 } : {}}
                                        />
                                    )}
                                    {index === 0 && mediaList.length > 1 && (
                                        <div className="scroll-indicador">
                                            <span>Deslizar hacia abajo</span>
                                            <span className="flecha-indicadora">↓</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="detalle-imagen-placeholder">👓</div>
                        )}
                    </div>

                    {/* Columna Derecha: Panel de Detalles Fijo */}
                    <div className="detalle-info-panel">
                        <div className="info-panel-cabecera">
                            <h1 className="info-titulo">{producto.name}</h1>
                            <button
                                className={`info-btn-favorito ${esFavorito(producto.id) ? 'activo' : ''}`}
                                onClick={() => toggleFavorito(producto)}
                                title={esFavorito(producto.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
                            >
                                <svg viewBox="0 0 24 24" className="bookmark-icono">
                                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                </svg>
                            </button>
                        </div>

                        <p className="info-precio">S/ {producto.price?.toLocaleString('es-PE')}</p>

                        <div className="info-stock-status" style={{ margin: '15px 0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {producto.stock <= 0 ? (
                                <span style={{ color: '#ef4444' }}>🔴 Sin Stock</span>
                            ) : producto.stock <= 3 ? (
                                <span style={{ color: '#f59e0b' }}>⚠️ ¡Pocas unidades! (Quedan {producto.stock})</span>
                            ) : (
                                <span style={{ color: '#10b981' }}>🟢 Stock disponible: {producto.stock}</span>
                            )}
                        </div>

                        {/* Botón de Añadir al Carrito */}
                        <button
                            className={`info-btn-carrito ${producto.stock <= 0 ? 'agotado' : ''}`}
                            disabled={producto.stock <= 0}
                            style={producto.stock <= 0 ? { backgroundColor: '#cbd5e1', cursor: 'not-allowed', color: '#64748b' } : {}}
                            onClick={() => {
                                if (producto.stock > 0) {
                                    agregarAlCarrito(producto)
                                }
                            }}
                        >
                            {producto.stock <= 0 ? 'Sin Stock' : 'Añadir al Carrito'}
                        </button>

                        {/* Acordeones Desplegables */}
                        <div className="info-acordeones">
                            <div className="acordeon-item">
                                <button
                                    className="acordeon-btn"
                                    onClick={() => setDetallesAbierto(!detallesAbierto)}
                                >
                                    <span>Descripcion</span>
                                    <span>{detallesAbierto ? '—' : '+'}</span>
                                </button>
                                <div className={`acordeon-contenido ${detallesAbierto ? 'abierto' : ''}`}>
                                    <p>
                                        {producto.descripcion || "No hay descripción disponible para este producto."}
                                    </p>
                                </div>
                            </div>

                            <div className="acordeon-item">
                                <button
                                    className="acordeon-btn"
                                    onClick={() => setEnvioAbierto(!envioAbierto)}
                                >
                                    <span>Envío</span>
                                    <span>{envioAbierto ? '—' : '+'}</span>
                                </button>
                                <div className={`acordeon-contenido ${envioAbierto ? 'abierto' : ''}`}>
                                    <p>
                                        Envío express gratuito a todo Perú. Las entregas se realizan entre 1 y 4 días
                                        hábiles.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DetalleProducto
