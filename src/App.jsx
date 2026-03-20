import { Routes, Route } from 'react-router-dom'
import './ComponentesGenerales/cabecera/principal.css'

import Inicio from './ComponentesPagInicio/Inicio'
import Coleccion from './ComponentePagPrincipal/Coleccion'
import Carrito from './ComponenteCarrito/Carrito'
import { CarritoProvider } from './context/CarritoContext'


function App() {
  return (
    <CarritoProvider>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/Coleccion" element={<Coleccion />} />
        <Route path="/Carrito" element={<Carrito />} />
      </Routes>
    </CarritoProvider>
  )
}

export default App
