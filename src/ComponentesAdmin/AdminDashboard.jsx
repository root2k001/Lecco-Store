import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminMetricas from './AdminMetricas';
import AdminPedidos from './AdminPedidos';
import AdminProductos from './AdminProductos';
import AdminMensajes from './AdminMensajes';
import AdminHistorial from './AdminHistorial';
import './AdminDashboard.css';

function AdminDashboard() {
  const { usuario, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario || usuario.rol !== 'admin') {
      navigate('/');
    } else {
      cargarDatos();
    }
  }, [usuario, navigate]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resPedidos, resProductos, resHistorial] = await Promise.all([
        fetch('/api/pedidos/admin/todos', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/productos'),
        fetch('/api/historial', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (resPedidos.status === 401 || resHistorial.status === 401) {
        logout();
        navigate('/');
        return;
      }

      const [dataPedidos, dataProductos, dataHistorial] = await Promise.all([
        resPedidos.json(),
        resProductos.json(),
        resHistorial.json()
      ]);

      if (resPedidos.ok) setPedidos(dataPedidos);
      if (resProductos.ok) setProductos(dataProductos);
      if (resHistorial.ok) setHistorial(dataHistorial);
    } catch (error) {
      console.error('Error cargando datos del panel:', error);
    } finally {
      setCargando(false);
    }
  };

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      )
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      )
    },
    {
      id: 'productos',
      label: 'Productos',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    {
      id: 'mensajes',
      label: 'Mensajes',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      )
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      )
    }
  ];

  if (cargando) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>Cargando Panel de Control...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-text">Lecco</span>
          <span className="admin-brand-sub">Admin Panel</span>
        </div>

        <nav className="admin-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-data">
              <span className="admin-user-name">{usuario?.nombre}</span>
              <span className="admin-user-role">Administrador</span>
            </div>
          </div>
          <button className="btn-volver-tienda" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Volver a la tienda
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="admin-content">
        {activeTab === 'dashboard' && (
          <AdminMetricas token={token} />
        )}

        {activeTab === 'pedidos' && (
          <AdminPedidos
            pedidos={pedidos}
            token={token}
            onReload={cargarDatos}
          />
        )}

        {activeTab === 'productos' && (
          <AdminProductos
            productos={productos}
            token={token}
            onReload={cargarDatos}
          />
        )}

        {activeTab === 'mensajes' && (
          <AdminMensajes token={token} />
        )}

        {activeTab === 'historial' && (
          <AdminHistorial historial={historial} />
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
