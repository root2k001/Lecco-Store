
import './principal.css'
import { Link } from 'react-router-dom'
import { useCarrito } from '../../context/CarritoContext'
import { useAuth } from '../../context/AuthContext'
import { useFavoritos } from '../../context/FavoritosContext'
import { useState } from 'react'
import AuthModal from '../AuthModal/AuthModal'

function Cabecera() {
    const { carrito, eliminarDelCarrito, agregarAlCarrito, incrementarCantidad, decrementarCantidad } = useCarrito()
    const { usuario, logout } = useAuth()
    const { listaFavoritos, toggleFavorito } = useFavoritos()
    const cantidadTotal = carrito.reduce((acc, item) => acc + item.quantity, 0)
    const [mostrarModal, setMostrarModal] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)

    const toggleModal = () => setMostrarModal(!mostrarModal)
    const total = carrito.reduce((acc, item) => acc + (item.price * item.quantity), 0)


    return (
        <section className="header">
            <Link to="/" className="logo">Lecco</Link>
            <nav className="navigation">
                <ul>
                    <li>
                        <Link to="/" className='menu-link'>Inicio</Link>
                    </li>
                    <li>
                        <Link to="/Coleccion" className='menu-link'>Colección</Link>
                    </li>
                    <li>
                        <Link to="/Nosotros" className='menu-link'>Nosotros</Link>
                    </li>
                    <li>
                        <Link to="/Contacto" className='menu-link'>Contacto</Link>
                    </li>
                    {!usuario ? (
                        <li>
                            <button 
                                className="carrito-icono" 
                                style={{ marginRight: '15px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '24px' }} 
                                onClick={() => setShowAuthModal(true)}
                                title="Iniciar Sesión"
                            >
                                👤
                            </button>
                        </li>
                    ) : (
                        <li className="usuario-nav">
                            {usuario.rol === 'admin' && (
                                <Link to="/admin" className="menu-link" style={{color: '#3b82f6', fontWeight: 'bold'}}>Panel Admin</Link>
                            )}
                            <Link to="/perfil" className="usuario-nombre" style={{textDecoration: 'none'}} title="Ir a Mi Perfil">Hola, {usuario.nombre}</Link>
                            <button className="btn-logout" onClick={logout}>Cerrar Sesión</button>
                        </li>
                    )}
                    <li className="carrito-container">
                        <button className="carrito-icono" onClick={toggleModal}>
                            🛒
                        </button>
                        {cantidadTotal > 0 && (
                            <span className="contador-productos">{cantidadTotal}</span>
                        )}
                    </li>
                </ul>
            </nav>

            {mostrarModal && (
                <div className="carrito-modal-overlay" onClick={toggleModal}>
                    <div className="carrito-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="carrito-modal-header">
                            <h2>Tu Carrito</h2>
                            <button className="carrito-modal-cerrar" onClick={toggleModal}>×</button>
                        </div>
                        <div className="carrito-modal-body">
                            {carrito.length === 0 ? (
                                <p className="carrito-vacio">Tu carrito está vacío</p>
                            ) : (
                                <ul className="carrito-productos">
                                    {carrito.map((item) => (
                                        <li key={item.id} className="carrito-item">
                                            <div className="carrito-item-contenido-izq">
                                                <div className="carrito-item-imagen">
                                                    {item.img && item.img !== 'en proceso' ? (
                                                        <img src={item.img} alt={item.name} />
                                                    ) : (
                                                        <span className="carrito-item-placeholder">👓</span>
                                                    )}
                                                </div>
                                                <div className="carrito-item-info">
                                                    <span className="carrito-item-nombre">{item.name}</span>
                                                    <div className="carrito-item-cantidad-selector">
                                                        <button 
                                                            className="btn-cantidad" 
                                                            onClick={() => decrementarCantidad(item.id)}
                                                            title="Disminuir cantidad"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="cantidad-numero">{item.quantity}</span>
                                                        <button 
                                                            className="btn-cantidad" 
                                                            onClick={() => incrementarCantidad(item.id)}
                                                            title={item.quantity >= (item.stock !== undefined ? item.stock : Infinity) ? "Límite de stock alcanzado" : "Aumentar cantidad"}
                                                            disabled={item.quantity >= (item.stock !== undefined ? item.stock : Infinity)}
                                                            style={item.quantity >= (item.stock !== undefined ? item.stock : Infinity) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="carrito-item-acciones">
                                                <span className="carrito-item-precio">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                                                <button 
                                                    className="carrito-item-eliminar"
                                                    onClick={() => eliminarDelCarrito(item.id)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {listaFavoritos.length > 0 && (
                            <div className="carrito-favoritos-seccion">
                                <p className="carrito-favoritos-titulo">Tus Favoritos</p>
                                <div className="favoritos-horizontal-list">
                                    {listaFavoritos.map(fav => (
                                        <div key={fav.id} className="favorito-horizontal-card">
                                            <button
                                                className="fav-card-quitar"
                                                onClick={() => toggleFavorito(fav)}
                                                title="Quitar de favoritos"
                                            >
                                                ×
                                            </button>
                                            <div className="fav-card-imagen">
                                                {fav.img && fav.img !== 'en proceso'
                                                    ? <img src={fav.img} alt={fav.name} />
                                                    : <span className="fav-card-placeholder">👓</span>
                                                }
                                            </div>
                                            <div className="fav-card-info">
                                                <div className="fav-card-divisor"></div>
                                                <div className="fav-card-meta">
                                                    <div className="fav-card-datos">
                                                        <h4 className="fav-card-nombre">{fav.name}</h4>
                                                        <p className="fav-card-precio">${fav.price?.toLocaleString('es-CL')}</p>
                                                    </div>
                                                    <button
                                                        className="fav-card-btn-carrito"
                                                        onClick={() => agregarAlCarrito(fav)}
                                                        title="Añadir al carrito"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="9" cy="21" r="1"></circle>
                                                            <circle cx="20" cy="21" r="1"></circle>
                                                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {carrito.length > 0 && (
                            <div className="carrito-modal-footer">
                                <div className="carrito-total">
                                    <span>Total:</span>
                                    <span>${total}</span>
                                </div>
                                <Link 
                                    to="/Carrito" 
                                    className="btn-visualizar-carrito"
                                    onClick={toggleModal}
                                >
                                    Visualizar Carrito
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAuthModal && (
                <AuthModal 
                    onClose={() => setShowAuthModal(false)} 
                    onSuccess={() => setShowAuthModal(false)} 
                />
            )}
        </section>
    )
}

export default Cabecera;