import { Link } from 'react-router-dom'
import './Carrito.css'
import { useCarrito } from '../context/CarritoContext'

function Carrito() {
    const { carrito, eliminarDelCarrito, incrementarCantidad, decrementarCantidad, vaciarCarrito } = useCarrito()
    const total = carrito.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const cantidadTotal = carrito.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="carrito-page">
            <h1>Tu Carrito de Compras</h1>
            
            {carrito.length === 0 ? (
                <div className="carrito-vacio">
                    <span className="carrito-vacio-icono">🛒</span>
                    <p>Tu carrito está vacío</p>
                    <Link to="/Coleccion" className="btn-seguir-comprando">
                        Ver colección
                    </Link>
                </div>
            ) : (
                <div className="carrito-contenido">
                    <div className="carrito-productos">
                        <div className="carrito-header">
                            <span>{cantidadTotal} producto{cantidadTotal !== 1 ? 's' : ''}</span>
                            <button className="btn-vaciar" onClick={vaciarCarrito}>
                                Vaciar carrito
                            </button>
                        </div>
                        <ul className="carrito-lista">
                            {carrito.map((item) => (
                                <li key={item.id} className="carrito-item">
                                    <div className="carrito-item-imagen">
                                        {item.img && item.img !== 'en proceso' ? (
                                            <img src={item.img} alt={item.name} />
                                        ) : (
                                            <div className="imagen-placeholder">👓</div>
                                        )}
                                    </div>
                                    <div className="carrito-item-info">
                                        <span className="carrito-item-nombre">{item.name}</span>
                                        <span className="carrito-item-genero">{item.gender}</span>
                                        <span className="carrito-item-precio-unitario">${item.price} c/u</span>
                                    </div>
                                    <div className="carrito-item-cantidad-control">
                                        <button 
                                            className="btn-cantidad"
                                            onClick={() => decrementarCantidad(item.id)}
                                            disabled={item.quantity <= 1}
                                        >
                                            −
                                        </button>
                                        <span className="cantidad-numero">{item.quantity}</span>
                                        <button 
                                            className="btn-cantidad"
                                            onClick={() => incrementarCantidad(item.id)}
                                        >
                                            +
                                        </button>
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
                    </div>

                    <div className="carrito-resumen">
                        <h2>Resumen del Pedido</h2>
                        <div className="carrito-resumen-item">
                            <span>Subtotal ({cantidadTotal} producto{cantidadTotal !== 1 ? 's' : ''})</span>
                            <span>${total}</span>
                        </div>
                        <div className="carrito-resumen-item">
                            <span>Envío</span>
                            <span className="envio-gratis">Gratis</span>
                        </div>
                        <div className="carrito-resumen-item total">
                            <span>Total</span>
                            <span>${total}</span>
                        </div>
                        <button className="btn-checkout">Proceder al Pago</button>
                        <Link to="/Coleccion" className="btn-seguir-comprando">
                            Continuar Comprando
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Carrito
