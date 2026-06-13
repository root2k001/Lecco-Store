import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Perfil.css';

function Perfil() {
  const { usuario, token, actualizarPerfil } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    if (!usuario) {
      navigate('/');
    } else {
      setNombre(usuario.nombre || '');
      setEmail(usuario.email || '');
      cargarMisPedidos();
    }
  }, [usuario, navigate]);

  const cargarMisPedidos = async () => {
    try {
      const res = await fetch('/api/pedidos/mis-pedidos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPedidos(data);
      }
    } catch (error) {
      console.error('Error al cargar pedidos', error);
    } finally {
      setCargando(false);
    }
  };

  const handleActualizarDatos = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    try {
      await actualizarPerfil({ nombre, email, password });
      setMensaje({ tipo: 'exito', texto: '¡Tus datos se actualizaron correctamente!' });
      setPassword(''); // Limpiamos la contraseña por seguridad
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    }
  };

  if (!usuario) return null;

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>Mi Perfil</h1>
        <p>Gestiona tu información personal y revisa tus compras</p>
      </div>

      <div className="perfil-grid">
        <div className="perfil-card">
          <h2>Datos Personales</h2>
          {mensaje.texto && (
            <div className={`mensaje-alerta ${mensaje.tipo}`}>
              {mensaje.texto}
            </div>
          )}
          <form className="perfil-form" onSubmit={handleActualizarDatos}>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Nueva Contraseña (Opcional)</label>
              <input 
                type="password" 
                placeholder="Déjalo en blanco si no deseas cambiarla"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <button type="submit" className="btn-guardar">Guardar Cambios</button>
          </form>
        </div>

        <div className="perfil-card">
          <h2>Historial de Pedidos</h2>
          {cargando ? (
            <p>Cargando tus compras...</p>
          ) : pedidos.length === 0 ? (
            <div className="sin-pedidos">
              <p>Aún no has realizado ninguna compra.</p>
            </div>
          ) : (
            <div className="historial-lista">
              {pedidos.map(pedido => (
                <div key={pedido.id} className="pedido-item">
                  <div className="pedido-header">
                    <span className="pedido-id">Pedido #{pedido.id}</span>
                    <span className={`pedido-estado ${pedido.estado}`}>{pedido.estado}</span>
                  </div>
                  <div className="pedido-detalles">
                    <p><strong>Fecha:</strong> {new Date(pedido.creadoEn).toLocaleDateString()}</p>
                    <p><strong>Total:</strong> ${pedido.total}</p>
                    <p><strong>Enviado a:</strong> {pedido.direccion}, {pedido.ciudad}</p>
                  </div>
                  <div className="pedido-productos">
                    {pedido.items.map((item, index) => (
                      <span key={index} className="producto-tag">
                        {item.cantidad}x {item.producto?.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Perfil;
