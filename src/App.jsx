import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Inicio from './PaginaInicio/Inicio'
import Lentes from './PaginaCatalogo/Lentes.jsx'
import Sale from './PaginaCatalogo/Sale.jsx'
import Campana from './PaginaCatalogo/Campana.jsx'
import Carrito from './PaginaCarrito/mainCarrito.jsx'
import PagoResultado from './PaginaCarrito/PagoResultado.jsx'
import Nosotros from './PaginaInformacion/Nosotros.jsx'

import NotFound from './PaginaInformacion/NotFound.jsx'
// Carga diferida: el panel admin y el perfil no van en el bundle inicial de la tienda
const AdminDashboard = lazy(() => import('./PaginaAdmin/AdminDashboard.jsx'))
const Perfil = lazy(() => import('./PaginaPerfil/Perfil.jsx'))
import RutaAdmin from './Compartidos/RutaAdmin/RutaAdmin.jsx'
import ErrorBoundary from './Compartidos/ErrorBoundary/ErrorBoundary.jsx'



import { CarritoProvider } from './context/CarritoContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritosProvider } from './context/FavoritosContext'
import { ToastProvider } from './context/ToastContext'


function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <FavoritosProvider>
            <CarritoProvider>
              <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>}>
              <Routes>
                <Route path="/" element={<Inicio />} />
                {/* La pestaña Colección ya no existe: los enlaces antiguos redirigen al catálogo */}
                <Route path="/Coleccion" element={<Navigate to="/Lentes" replace />} />
                <Route path="/Lentes" element={<Lentes />} />
                <Route path="/Sale" element={<Sale />} />
                <Route path="/campanas/:slug" element={<Campana />} />
                <Route path="/Carrito" element={<Carrito />} />
                <Route path="/pago/resultado" element={<PagoResultado />} />
                <Route path="/Nosotros" element={<Nosotros />} />
                <Route path="/admin" element={<RutaAdmin><AdminDashboard /></RutaAdmin>} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </CarritoProvider>
          </FavoritosProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

