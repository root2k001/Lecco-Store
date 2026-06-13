import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Carrito.css'
import { useCarrito } from '../context/CarritoContext'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../ComponentesGenerales/AuthModal/AuthModal'

function Carrito() {
    const { carrito, eliminarDelCarrito, incrementarCantidad, decrementarCantidad, vaciarCarrito } = useCarrito()
    const { usuario, token } = useAuth()
    
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [compraExitosa, setCompraExitosa] = useState(false)
    const [procesando, setProcesando] = useState(false)
    
    // Nuevo estado para el formulario de envío
    const [mostrarEnvio, setMostrarEnvio] = useState(false)
    const [envioDatos, setEnvioDatos] = useState({
        direccion: '',
        ciudad: '',
        codigoPostal: '',
        telefono: ''
    })

    const total = carrito.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const cantidadTotal = carrito.reduce((acc, item) => acc + item.quantity, 0)

    const handleProcederPago = () => {
        if (!usuario) {
            setShowAuthModal(true)
        } else {
            setMostrarEnvio(true)
        }
    }

    const procesarPedido = async (e) => {
        if(e) e.preventDefault();

        try {
            setProcesando(true)
            
            const items = carrito.map(item => ({
                productoId: item.id,
                cantidad: item.quantity,
                precio: item.price
            }))

            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    total: total,
                    items: items,
                    direccion: envioDatos.direccion,
                    ciudad: envioDatos.ciudad,
                    codigoPostal: envioDatos.codigoPostal,
                    telefono: envioDatos.telefono
                })
            })

            if (!response.ok) {
                throw new Error('Error al procesar el pedido en el servidor')
            }

            vaciarCarrito()
            setCompraExitosa(true)
            setMostrarEnvio(false)
        } catch (error) {
            console.error('Error:', error)
            alert('Hubo un problema al procesar tu pedido. Por favor intenta de nuevo.')
        } finally {
            setProcesando(false)
        }
    }

    if (compraExitosa) {
        return (
            <div className="carrito-page">
                <div className="carrito-vacio" style={{ marginTop: '50px' }}>
                    <span className="carrito-vacio-icono">🎉</span>
                    <h2>¡Gracias por tu compra, {usuario?.nombre}!</h2>
                    <p>Tu pedido ha sido registrado exitosamente y será enviado a:</p>
                    <p><strong>{envioDatos.direccion}, {envioDatos.ciudad}</strong></p>
                    <br/>
                    <Link to="/Coleccion" className="btn-seguir-comprando" onClick={() => setCompraExitosa(false)}>
                        Volver a la tienda
                    </Link>
                </div>
            </div>
        )
    }

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
                                            disabled={item.quantity >= (item.stock !== undefined ? item.stock : Infinity)}
                                            title={item.quantity >= (item.stock !== undefined ? item.stock : Infinity) ? "Límite de stock alcanzado" : "Aumentar cantidad"}
                                            style={item.quantity >= (item.stock !== undefined ? item.stock : Infinity) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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

                        {!mostrarEnvio ? (
                            <>
                                <button 
                                    className="btn-checkout" 
                                    onClick={handleProcederPago}
                                >
                                    Proceder al Pago
                                </button>
                                <Link to="/Coleccion" className="btn-seguir-comprando">
                                    Continuar Comprando
                                </Link>
                            </>
                        ) : (
                            <form className="envio-form" onSubmit={procesarPedido}>
                                <h3>Datos de Envío</h3>
                                <input 
                                    required type="text" placeholder="Dirección completa" 
                                    value={envioDatos.direccion} onChange={e => setEnvioDatos({...envioDatos, direccion: e.target.value})} 
                                />
                                <input 
                                    required type="text" placeholder="Ciudad" 
                                    value={envioDatos.ciudad} onChange={e => setEnvioDatos({...envioDatos, ciudad: e.target.value})} 
                                />
                                <div className="envio-row">
                                    <input 
                                        required type="text" placeholder="C.P." 
                                        value={envioDatos.codigoPostal} onChange={e => setEnvioDatos({...envioDatos, codigoPostal: e.target.value})} 
                                    />
                                    <input 
                                        required type="text" placeholder="Teléfono" 
                                        value={envioDatos.telefono} onChange={e => setEnvioDatos({...envioDatos, telefono: e.target.value})} 
                                    />
                                </div>
                                <div className="envio-botones">
                                    <button type="button" className="btn-volver" onClick={() => setMostrarEnvio(false)}>Atrás</button>
                                    <button type="submit" className="btn-checkout confirmar" disabled={procesando}>
                                        {procesando ? 'Procesando...' : 'Confirmar Pedido'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showAuthModal && (
                <AuthModal 
                    onClose={() => setShowAuthModal(false)} 
                    onSuccess={() => {
                        setShowAuthModal(false)
                        // Al iniciar sesión, se le abrirá el formulario de envío automáticamente
                        setMostrarEnvio(true)
                    }} 
                />
            )}
        </div>
    )
}

export default Carrito
