import { Routes, Route } from 'react-router-dom'
import Inicio from './ComponentesPagInicio/Inicio'
import Coleccion from './ComponentePagPrincipal/Coleccion'
import Carrito from './ComponenteCarrito/mainCarrito.jsx'
import Nosotros from './ComponenteInformacion/Nosotros.jsx'
import Contacto from './ComponenteInformacion/Contacto.jsx'
import NotFound from './ComponenteInformacion/NotFound.jsx'
import { CarritoProvider } from './context/CarritoContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritosProvider } from './context/FavoritosContext'
import { ToastProvider } from './context/ToastContext'

import AdminDashboard from './ComponentesAdmin/AdminDashboard.jsx'
import Perfil from './ComponentePerfil/Perfil.jsx'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FavoritosProvider>
        <CarritoProvider>
          <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/Coleccion" element={<Coleccion />} />
          <Route path="/Carrito" element={<Carrito />} />
          <Route path="/Nosotros" element={<Nosotros />} />
          <Route path="/Contacto" element={<Contacto />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
          </CarritoProvider>
        </FavoritosProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

