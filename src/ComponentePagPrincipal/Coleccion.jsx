import { useState } from 'react'
import './cabecera/principal.css'
import Cabecera from './cabecera/cabecera';
import Productos from './ListaProductos/Productos'
import DetalleProducto from './DetallesProductos/DetallesProductos'

function Principal(){
    const [productoSeleccionado, setProductoSeleccionado] = useState(null)

    const handleImageClick = (producto) => {
        setProductoSeleccionado(producto)
    }

    const handleCerrarModal = () => {
        setProductoSeleccionado(null)
    }

    return(
        <div className="Principal-container">
            <Cabecera />
            <Productos onImageClick={handleImageClick} />
            {productoSeleccionado && (
                <DetalleProducto 
                    producto={productoSeleccionado} 
                    onCerrar={handleCerrarModal} 
                />
            )}
        </div>
    )
}

export default Principal;
