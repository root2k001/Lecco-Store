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
      const resPedidos = await fetch('http://localhost:3000/api/pedidos/admin/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataPedidos = await resPedidos.json();
      
      // Cargar productos
      const resProductos = await fetch('http://localhost:3000/api/productos');
      const dataProductos = await resProductos.json();

      if (resPedidos.ok) setPedidos(dataPedidos);
      if (resProductos.ok) setProductos(dataProductos);
    } catch (error) {
      console.error('Error cargando datos del panel:', error);
    } finally {
      setCargando(false);
    }
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/admin/estado/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (res.ok) {
        setPedidos(pedidos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
      } else {
        alert('Error al actualizar el estado');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const actualizarStock = async (id, nuevoStock) => {
    try {
      const res = await fetch(`http://localhost:3000/api/productos/${id}`, {
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
      </div>
    </div>
  );
}

export default AdminDashboard;
