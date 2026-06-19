import { useState, useMemo, Fragment } from 'react';
import ExportCSV from './ExportCSV';

function AdminPedidos({ pedidos, token, onReload }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [expandido, setExpandido] = useState(null);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const coincideBusqueda = !busqueda ||
        p.usuario?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.usuario?.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        `#${p.id}`.includes(busqueda);
      const coincideEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [pedidos, busqueda, filtroEstado]);

  const actualizarEstado = async (id, nuevoEstado) => {
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
        onReload();
      } else {
        alert('Error al actualizar el estado');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const csvHeaders = [
    { label: 'ID', accessor: p => p.id },
    { label: 'Cliente', accessor: p => p.usuario?.nombre || '' },
    { label: 'Email', accessor: p => p.usuario?.email || '' },
    { label: 'Fecha', accessor: p => new Date(p.creadoEn).toLocaleDateString() },
    { label: 'Total', accessor: p => p.total },
    { label: 'Estado', accessor: p => p.estado },
    { label: 'Dirección', accessor: p => p.direccion || '' },
    { label: 'Ciudad', accessor: p => p.ciudad || '' }
  ];

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3>Gestión de Pedidos</h3>
        <ExportCSV data={pedidosFiltrados} headers={csvHeaders} filename="pedidos_lecco" />
      </div>

      <div className="admin-filtros">
        <div className="admin-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94a3b8" strokeWidth="2" fill="none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente, email o #ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="admin-select"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="procesando">Procesando</option>
          <option value="enviado">Enviado</option>
          <option value="entregado">Entregado</option>
        </select>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div className="admin-empty">No se encontraron pedidos</div>
      ) : (
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
            {pedidosFiltrados.map(pedido => (
              <Fragment key={pedido.id}>
                <tr
                  className={`admin-row-clickable ${expandido === pedido.id ? 'row-expanded' : ''}`}
                  onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
                >
                  <td>#{pedido.id}</td>
                  <td>
                    <div className="pedido-cliente">
                      <span className="pedido-cliente-nombre">{pedido.usuario?.nombre}</span>
                      <span className="pedido-cliente-email">{pedido.usuario?.email}</span>
                    </div>
                  </td>
                  <td>{new Date(pedido.creadoEn).toLocaleDateString()}</td>
                  <td className="td-precio">S/ {Number(pedido.total).toLocaleString('es-PE')}</td>
                  <td>{pedido.direccion ? `${pedido.direccion}, ${pedido.ciudad}` : '—'}</td>
                  <td>
                    <span className={`estado-badge ${pedido.estado}`}>{pedido.estado}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <select
                      className="admin-select-sm"
                      value={pedido.estado}
                      onChange={(e) => actualizarEstado(pedido.id, e.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="procesando">Procesando</option>
                      <option value="enviado">Enviado</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </td>
                </tr>
                {expandido === pedido.id && pedido.items && (
                  <tr key={`det-${pedido.id}`} className="pedido-detalle-row">
                    <td colSpan="7">
                      <div className="pedido-detalle">
                        <p className="pedido-detalle-titulo">Productos del pedido</p>
                        <div className="pedido-items-grid">
                          {pedido.items.map((item, idx) => (
                            <div key={idx} className="pedido-item-card">
                              <span className="pedido-item-nombre">{item.producto?.nombre || `Producto #${item.productoId}`}</span>
                              <div className="pedido-item-meta">
                                <span>Cant: {item.cantidad}</span>
                                <span>P/U: S/ {Number(item.precioUnit).toLocaleString('es-PE')}</span>
                                <span className="pedido-item-subtotal">
                                  S/ {(item.cantidad * Number(item.precioUnit)).toLocaleString('es-PE')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminPedidos;
