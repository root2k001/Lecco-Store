

import Cabecera from '../ComponentesGenerales/cabecera/cabecera.jsx';
import Productos from './ListaProductos/Productos';
import PiePagina from '../ComponentesGenerales/footer/Footer.jsx';

function Principal(){


    return(
        <div className="Principal-container">
            <Cabecera />
            <Productos  />
          <PiePagina />
          
        </div>
    )
}

export default Principal;
