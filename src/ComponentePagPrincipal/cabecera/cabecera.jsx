
import './principal.css'


import { Link } from 'react-router-dom'


function Cabecera(){

return(

    <section className="header">
        <Link to="/" className="logo">Lecco</Link>
   <nav className="navigation">
     <ul>
       <li>
         <Link to="/" className='menu-link'>Inicio</Link>
       </li>
       <li>
         <Link to="/Coleccion" className='menu-link'>Colección</Link>
       </li>
       <li>
         <Link to="/Nosotros" className='menu-link'>Nosotros</Link>
       </li>
       <li>
         <Link to="/Contacto" className='menu-link'>Contacto</Link>
       </li>
     </ul>
   </nav>

    </section>

    

)


}


export default  Cabecera;