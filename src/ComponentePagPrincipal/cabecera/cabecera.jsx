
import './principal.css'
import { Link } from 'react-router-dom'
import { useCarrito } from '../../context/CarritoContext'
import { useState } from 'react'


function Cabecera() {
    const { carrito, eliminarDelCarrito } = useCarrito()
    const cantidadTotal = carrito.reduce((acc, item) => acc + item.quantity, 0)
    const [mostrarModal, setMostrarModal] = useState(false)

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
                                            <div className="carrito-item-info">
                                                <span className="carrito-item-nombre">{item.name}</span>
                                                <span className="carrito-item-cantidad">x{item.quantity}</span>
                                            </div>
                                            <div className="carrito-item-acciones">
                                                <span className="carrito-item-precio">${item.price * item.quantity}</span>
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
        </section>
    )
}

export default Cabecera;