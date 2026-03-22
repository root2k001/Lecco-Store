import { Routes, Route } from 'react-router-dom'
import Inicio from './ComponentesPagInicio/Inicio'
import Coleccion from './ComponentePagPrincipal/Coleccion'
import Carrito from './ComponenteCarrito/mainCarrito.jsx'
import Nosotros from './ComponenteInformacion/Nosotros.jsx'
import Contacto from './ComponenteInformacion/Contacto.jsx'
import { CarritoProvider } from './context/CarritoContext'


function App() {
  return (
    <CarritoProvider>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/Coleccion" element={<Coleccion />} />
        <Route path="/Carrito" element={<Carrito />} />
        <Route path="/Nosotros" element={<Nosotros />} />
        <Route path="/Contacto" element={<Contacto />} />
      </Routes>
    </CarritoProvider>
  )
}

export default App
