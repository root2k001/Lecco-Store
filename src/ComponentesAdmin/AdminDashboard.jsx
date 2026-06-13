import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const { usuario, token } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('pedidos');
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Si no está logueado o no es admin, redirigir
    if (!usuario || usuario.rol !== 'admin') {
      navigate('/');
    } else {
      cargarDatos();
    }
  }, [usuario, navigate]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar pedidos
      const resPedidos = await fetch('/api/pedidos/admin/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataPedidos = await resPedidos.json();
      
      // Cargar productos
      const resProductos = await fetch('/api/productos');
      const dataProductos = await resProductos.json();

      // Cargar historial de cambios
      const resHistorial = await fetch('/api/historial', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataHistorial = await resHistorial.json();

      if (resPedidos.ok) setPedidos(dataPedidos);
      if (resProductos.ok) setProductos(dataProductos);
      if (resHistorial.ok) setHistorial(dataHistorial);
    } catch (error) {
      console.error('Error cargando datos del panel:', error);
    } finally {
      setCargando(false);
    }
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`/api/pedidos/admin/estado/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (res.ok) {
        setPedidos(pedidos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
        cargarDatos(); // Recargar para actualizar el historial
      } else {
        alert('Error al actualizar el estado');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const actualizarStock = async (id, nuevoStock) => {
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ stock: parseInt(nuevoStock) })
      });

      if (res.ok) {
        setProductos(productos.map(p => p.id === id ? { ...p, stock: parseInt(nuevoStock) } : p));
        alert('Stock actualizado');
        cargarDatos(); // Recargar para actualizar el historial
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (cargando) return <div className="admin-loading">Cargando Panel de Control...</div>;

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <h2>Panel Admin</h2>
        <ul>
          <li 
            className={activeTab === 'pedidos' ? 'active' : ''} 
            onClick={() => setActiveTab('pedidos')}
          >
            📦 Gestión de Pedidos
          </li>
          <li 
            className={activeTab === 'productos' ? 'active' : ''} 
            onClick={() => setActiveTab('productos')}
          >
            👟 Inventario
          </li>
          <li 
            className={activeTab === 'historial' ? 'active' : ''} 
            onClick={() => setActiveTab('historial')}
          >
            📜 Historial de Cambios
          </li>
        </ul>
      </div>

      <div className="admin-content">
        {activeTab === 'pedidos' && (
          <div className="admin-section">
            <h3>Todos los Pedidos</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(pedido => (
                  <tr key={pedido.id}>
                    <td>#{pedido.id}</td>
                    <td>{pedido.usuario?.nombre} ({pedido.usuario?.email})</td>
                    <td>{new Date(pedido.creadoEn).toLocaleDateString()}</td>
                    <td>${pedido.total}</td>
                    <td>{pedido.direccion}, {pedido.ciudad}</td>
                    <td>
                      <span className={`estado-badge ${pedido.estado}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={pedido.estado} 
                        onChange={(e) => actualizarEstadoPedido(pedido.id, e.target.value)}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="procesando">Procesando</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'productos' && (
          <div className="admin-section">
            <h3>Inventario de Productos</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Stock Actual</th>
                  <th>Actualizar Stock</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(producto => (
                  <tr key={producto.id}>
                    <td>#{producto.id}</td>
                    <td>{producto.nombre}</td>
                    <td>${producto.precio}</td>
                    <td>{producto.stock}</td>
                    <td>
                      <div className="stock-update-control">
                        <input 
                          type="number" 
                          id={`stock-${producto.id}`}
                          defaultValue={producto.stock}
                          min="0"
                        />
                        <button 
                          onClick={() => {
                            const val = document.getElementById(`stock-${producto.id}`).value;
                            actualizarStock(producto.id, val);
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="admin-section">
            <h3>Historial de Cambios Realizados</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Administrador</th>
                  <th>Acción</th>
                  <th>Detalles del Cambio</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                      No hay cambios registrados en el historial.
                    </td>
                  </tr>
                ) : (
                  historial.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.creadoEn).toLocaleString('es-CL')}</td>
                      <td>
                        <strong>{log.admin?.nombre || 'Admin'}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{log.admin?.email || ''}</div>
                      </td>
                      <td>
                        <span className={`accion-badge ${log.accion.toLowerCase().includes('stock') ? 'badge-stock' : 'badge-pedido'}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td>{log.detalle}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
