import Link from 'next/link'
import './inicio.css'
  
function Columna2(){

    return(
        <div className="columna2">
            <div className="fondo-pagina"></div>
            <Link href="/Coleccion" className='boton'>Ver colección</Link>
        </div>
    )
}
export default Columna2;