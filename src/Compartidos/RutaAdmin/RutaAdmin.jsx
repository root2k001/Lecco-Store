import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RutaAdmin — Componente de ruta protegida para el panel de administrador.
 * Si el usuario no está autenticado o no tiene rol 'admin', redirige al inicio.
 */
function RutaAdmin({ children }) {
    const { usuario, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p>Verificando permisos...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    if (usuario.rol !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default RutaAdmin;
