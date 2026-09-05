import { Routes, Route } from 'react-router-dom'
import Inicio from './PaginaInicio/Inicio'
import Coleccion from './PaginaCatalogo/Coleccion'
import Carrito from './PaginaCarrito/mainCarrito.jsx'
import Nosotros from './PaginaInformacion/Nosotros.jsx'
import Contacto from './PaginaInformacion/Contacto.jsx'
import NotFound from './PaginaInformacion/NotFound.jsx'
import AdminDashboard from './PaginaAdmin/AdminDashboard.jsx'
import Perfil from './PaginaPerfil/Perfil.jsx'
import RutaAdmin from './Compartidos/RutaAdmin/RutaAdmin.jsx'



import { CarritoProvider } from './context/CarritoContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritosProvider } from './context/FavoritosContext'
import { ToastProvider } from './context/ToastContext'


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
              <Route path="/admin" element={<RutaAdmin><AdminDashboard /></RutaAdmin>} />
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

