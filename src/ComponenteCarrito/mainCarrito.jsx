import { useState } from "react";
import Carrito from "./Carrito.jsx"; 
import Cabecera from "../ComponentesGenerales/cabecera/cabecera.jsx";
import PiePagina from '../ComponentesGenerales/footer/Footer.jsx';

function CarritoMain(){


        return(
          <div className="carrito-pagina">
               <Cabecera /> 
                <Carrito />
              <PiePagina />


          </div>

        )


}

export default CarritoMain;