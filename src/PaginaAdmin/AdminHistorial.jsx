import ExportCSV from './ExportCSV';

function AdminHistorial({ historial }) {
  const csvHeaders = [
    { label: 'Fecha', accessor: l => new Date(l.creadoEn).toLocaleString('es-PE') },
    { label: 'Administrador', accessor: l => l.admin?.nombre || 'Admin' },
    { label: 'Email Admin', accessor: l => l.admin?.email || '' },
    { label: 'Acción', accessor: l => l.accion },
    { label: 'Detalle', accessor: l => l.detalle }
  ];

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3>Historial de Cambios</h3>
        <ExportCSV data={historial} headers={csvHeaders} filename="historial_lecco" />
      </div>

      {historial.length === 0 ? (
        <div className="admin-empty">No hay cambios registrados en el historial.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Administrador</th>
              <th>Acción</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {historial.map(log => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(log.creadoEn).toLocaleString('es-PE')}
                </td>
                <td>
                  <div className="pedido-cliente">
                    <span className="pedido-cliente-nombre">{log.admin?.nombre || 'Admin'}</span>
                    <span className="pedido-cliente-email">{log.admin?.email || ''}</span>
                  </div>
                </td>
                <td>
                  <span className={`accion-badge ${log.accion.toLowerCase().includes('stock') ? 'badge-stock' : 'badge-pedido'}`}>
                    {log.accion}
                  </span>
                </td>
                <td className="td-detalle">{log.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminHistorial;
