import { Link } from 'react-router-dom'
import './inicio.css'
  
function Columna2(){

    return(
        <div className="columna2">
            <div className="fondo-pagina"></div>
            <Link to="/Coleccion" className='boton'>Ver colección</Link>
        </div>
    )
}
export default Columna2;