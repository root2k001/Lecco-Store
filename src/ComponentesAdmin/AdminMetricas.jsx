import { useState, useEffect } from 'react';

function AdminMetricas({ token }) {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        // En caso de 401, simplemente retorna, AdminDashboard manejará el logout principal
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="admin-tab-loading">Cargando métricas...</div>;
  if (!stats) return <div className="admin-tab-loading">Error al cargar estadísticas</div>;

  const kpis = [
    {
      label: 'Ingresos Totales',
      value: `S/ ${Number(stats.ingresosTotales).toLocaleString('es-PE')}`,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      color: '#10b981'
    },
    {
      label: 'Pedidos Hoy',
      value: stats.pedidosHoy,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      color: '#3b82f6'
    },
    {
      label: 'Total Pedidos',
      value: stats.totalPedidos,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      color: '#8b5cf6'
    },
    {
      label: 'Clientes',
      value: stats.totalClientes,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: '#f59e0b'
    },
    {
      label: 'Productos',
      value: stats.totalProductos,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      color: '#06b6d4'
    },
    {
      label: 'Mensajes',
      value: stats.totalMensajes,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      color: '#ec4899'
    }
  ];

  return (
    <div className="admin-metricas">
      <h3>Dashboard</h3>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ color: kpi.color, backgroundColor: `${kpi.color}12` }}>
              {kpi.icon}
            </div>
            <div className="kpi-data">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Estado de pedidos */}
      <div className="metricas-row">
        <div className="metricas-card">
          <h4>Estado de Pedidos</h4>
          <div className="estado-bars">
            {Object.entries(stats.pedidosPorEstado).map(([estado, count]) => {
              const total = stats.totalPedidos || 1;
              const pct = Math.round((count / total) * 100);
              const colores = {
                pendiente: '#f59e0b',
                procesando: '#3b82f6',
                enviado: '#ec4899',
                entregado: '#10b981'
              };
              return (
                <div key={estado} className="estado-bar-row">
                  <div className="estado-bar-label">
                    <span className="estado-dot" style={{ backgroundColor: colores[estado] }} />
                    <span>{estado}</span>
                  </div>
                  <div className="estado-bar-track">
                    <div
                      className="estado-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: colores[estado] }}
                    />
                  </div>
                  <span className="estado-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos con stock bajo */}
        <div className="metricas-card">
          <h4>Stock Bajo <span className="badge-alerta">{stats.productosBajoStock.length}</span></h4>
          {stats.productosBajoStock.length === 0 ? (
            <p className="text-muted">Todos los productos tienen stock suficiente.</p>
          ) : (
            <ul className="stock-bajo-list">
              {stats.productosBajoStock.map(p => (
                <li key={p.id}>
                  <span className="stock-bajo-nombre">{p.nombre}</span>
                  <span className={`stock-bajo-qty ${p.stock === 0 ? 'stock-agotado' : ''}`}>
                    {p.stock === 0 ? 'AGOTADO' : `${p.stock} uds`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminMetricas;
