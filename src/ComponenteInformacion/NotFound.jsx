import { Link } from 'react-router-dom'
import Cabecera from '../ComponentesGenerales/cabecera/cabecera'
import './NotFound.css'

function NotFound() {
  return (
    <div className="notfound-page">
      <Cabecera />
      <div className="notfound-container">
        <span className="notfound-numero">404</span>
        <h1>Página no encontrada</h1>
        <p>Lo sentimos, la página que buscas no existe o fue movida.</p>
        <div className="notfound-acciones">
          <Link to="/" className="notfound-btn-principal">Volver al Inicio</Link>
          <Link to="/Coleccion" className="notfound-btn-secundario">Ver Colección</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
