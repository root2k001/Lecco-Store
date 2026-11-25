import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

const AuthModal = ({ onClose, onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Consentimiento de marketing: sin marcar por defecto (Ley 29733)
    const [aceptaMarketing, setAceptaMarketing] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { login, registro } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                onSuccess(); // El login fue exitoso, continuamos con la acción
            } else {
                await registro(nombre, email, password, aceptaMarketing);
                // Después de registro exitoso, iniciamos sesión automáticamente para fluidez
                await login(email, password);
                onSuccess();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal-content">
                <button className="btn-close-modal" onClick={onClose}>×</button>
                <h2>{isLogin ? 'Inicia Sesión' : 'Crea una Cuenta'}</h2>
                <p className="auth-subtitle">Para proceder al pago necesitamos tus datos</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label>Nombre Completo</label>
                            <input 
                                type="text" 
                                required 
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {!isLogin && (
                        <label className="check-marketing">
                            <input
                                type="checkbox"
                                checked={aceptaMarketing}
                                onChange={(e) => setAceptaMarketing(e.target.checked)}
                            />
                            <span>Quiero recibir ofertas y novedades de Lecco por correo. Puedo darme de baja cuando quiera.</span>
                        </label>
                    )}
                    
                    <button type="submit" className="btn-auth-submit" disabled={loading}>
                        {loading ? 'Cargando...' : (isLogin ? 'Ingresar' : 'Registrarme')}
                    </button>
                </form>

                <div className="auth-switch">
                    {isLogin ? (
                        <p>¿No tienes cuenta? <span onClick={() => {setIsLogin(false); setError(null)}}>Regístrate aquí</span></p>
                    ) : (
                        <p>¿Ya tienes cuenta? <span onClick={() => {setIsLogin(true); setError(null)}}>Inicia sesión</span></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
