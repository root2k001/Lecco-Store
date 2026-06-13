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
    
    // Mocks de colores para el producto
    const coloresDisponibles = [
        { id: 'silver', nombre: 'Silver / Clear', hex: '#dcdcdc' },
        { id: 'gold', nombre: 'Gold / Black', hex: '#c9a962' },
        { id: 'tortoise', nombre: 'Tortoise / Brown', hex: '#5c4033' }
    ]
    const [colorSeleccionado, setColorSeleccionado] = useState(coloresDisponibles[0])

    if (!producto) return null

    // Generamos una lista de imágenes simulando variaciones de ángulos de Gentle Monster
    const imagenesProducto = [
        producto.img,
        producto.img, // segunda toma
        producto.img  // detalle cercano
    ].filter(img => img && img !== 'en proceso')

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-cerrar" onClick={onCerrar}>×</button>
                
                <div className="detalle-producto-container">
                    {/* Columna Izquierda: Carrusel de imágenes scrolleable verticalmente */}
                    <div className="detalle-imagenes-carrusel">
                        {imagenesProducto.length > 0 ? (
                            imagenesProducto.map((imgUrl, index) => (
                                <div className="carrusel-imagen-wrapper" key={index}>
                                    <img src={imgUrl} alt={`${producto.name} - Vista ${index + 1}`} style={producto.stock <= 0 ? { opacity: 0.6 } : {}} />
                                    {index === 0 && imagenesProducto.length > 1 && (
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
                        
                        <p className="info-precio">${producto.price?.toLocaleString('es-CL')}</p>

                        <div className="info-stock-status" style={{ margin: '15px 0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {producto.stock <= 0 ? (
                                <span style={{ color: '#ef4444' }}>🔴 Sin Stock</span>
                            ) : producto.stock <= 3 ? (
                                <span style={{ color: '#f59e0b' }}>⚠️ ¡Pocas unidades! (Quedan {producto.stock})</span>
                            ) : (
                                <span style={{ color: '#10b981' }}>🟢 Stock disponible: {producto.stock}</span>
                            )}
                        </div>
                        
                        {/* Selector de Color */}
                        <div className="info-color-seccion">
                            <span className="color-label-seleccionado">{colorSeleccionado.nombre}</span>
                            <div className="color-swatches-contenedor">
                                {coloresDisponibles.map(color => (
                                    <button
                                        key={color.id}
                                        className={`color-swatch-circulo ${colorSeleccionado.id === color.id ? 'activo' : ''}`}
                                        style={{ backgroundColor: color.hex }}
                                        onClick={() => setColorSeleccionado(color)}
                                        title={color.nombre}
                                    />
                                ))}
                            </div>
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
                                    <span>Detalles</span>
                                    <span>{detallesAbierto ? '—' : '+'}</span>
                                </button>
                                <div className={`acordeon-contenido ${detallesAbierto ? 'abierto' : ''}`}>
                                    <p>
                                        Gafas de sol de la colección permanente de Lecco. Montura de acetato 
                                        premium fabricada a mano con patillas elegantes y grabados metálicos característicos.
                                        Protección 100% contra rayos UV.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="acordeon-item">
                                <button 
                                    className="acordeon-btn" 
                                    onClick={() => setEnvioAbierto(!envioAbierto)}
                                >
                                    <span>Envío y Devoluciones</span>
                                    <span>{envioAbierto ? '—' : '+'}</span>
                                </button>
                                <div className={`acordeon-contenido ${envioAbierto ? 'abierto' : ''}`}>
                                    <p>
                                        Envío express gratuito a todo Chile. Las entregas se realizan entre 2 y 4 días 
                                        hábiles. Devoluciones autorizadas dentro de los primeros 30 días posteriores a la recepción.
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
