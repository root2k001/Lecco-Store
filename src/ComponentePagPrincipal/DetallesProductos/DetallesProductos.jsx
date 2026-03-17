import './Detalles.css'
import { useCarrito } from '../../context/CarritoContext'

const DetalleProducto = ({ producto, onCerrar }) => {
    
        const{ agregarAlCarrito, carrito }= useCarrito()
        const cantidadTotal = carrito.reduce((acc,item)=>  acc+ item.quantity, 0)


    if (!producto) return null

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-cerrar" onClick={onCerrar}>×</button>
                
                <div className="detalle-producto">
                    <div className="detalle-imagen">
                        {producto.img && producto.img !== 'en proceso' ? 
                            <img src={producto.img} alt={producto.name} /> : 
                            <div className="imagen-placeholder">👓</div>
                        }
                    </div>
                    
                    <div className="detalle-info">
                        <span className="genero-tag">{producto.gender}</span>
                        <h1>{producto.name}</h1>
                        <p className="detalle-precio">${producto.price}</p>
                        <p className="detalle-descripcion">
                            Descripción del producto {producto.name}. 
                            Lentes de alta calidad con estilo moderno y elegante.
                        </p>
                        <button className="btn-carrito" onClick={() => agregarAlCarrito(producto)}>Añadir al Carrito</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DetalleProducto
