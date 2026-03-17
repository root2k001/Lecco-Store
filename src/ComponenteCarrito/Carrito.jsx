import { Link } from 'react-router-dom'
import './Carrito.css'
import { useCarrito } from '../context/CarritoContext'
import Cabecera from '../ComponentePagPrincipal/cabecera/cabecera'

function Carrito() {
    const { carrito, eliminarDelCarrito } = useCarrito()
    const total = carrito.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const subtotal = total

    return (
        <div className="carrito-page">
            <Cabecera />
            <h1>Tu Carrito de Compras</h1>
            
            {carrito.length === 0 ? (
                <div className="carrito-vacio">
                    <p>Tu carrito está vacío</p>
                    <Link to="/Coleccion" className="btn-seguir-comprando">
                        Ver colección
                    </Link>
                </div>
            ) : (
                <div className="carrito-contenido">
                    <div className="carrito-productos">
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
                                        <span className="carrito-item-cantidad">Cantidad: {item.quantity}</span>
                                    </div>
                                    <div className="carrito-item-acciones">
                                        <span className="carrito-item-precio">${item.price * item.quantity}</span>
                                        <button 
                                            className="carrito-item-eliminar"
                                            onClick={() => eliminarDelCarrito(item.id)}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="carrito-resumen">
                        <h2>Resumen del Pedido</h2>
                        <div className="carrito-resumen-item">
                            <span>Subtotal</span>
                            <span>${subtotal}</span>
                        </div>
                        <div className="carrito-resumen-item">
                            <span>Envío</span>
                            <span>Gratis</span>
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
