import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RutaAdmin — Componente de ruta protegida para el panel de administrador.
 * Si el usuario no está autenticado o no tiene rol 'admin', redirige al inicio.
 */
function RutaAdmin({ children }) {
    const { usuario } = useAuth();

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    if (usuario.rol !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default RutaAdmin;
