

import Cabecera from '../Compartidos/cabecera/cabecera.jsx';
import Productos from './ListaProductos/Productos.jsx';
import PiePagina from '../Compartidos/footer/Footer.jsx';

function Principal() {


    return (
        <div className="Principal-container">
            <Cabecera />
            <Productos sale />
            <PiePagina />

        </div>
    )
}

export default Principal;
