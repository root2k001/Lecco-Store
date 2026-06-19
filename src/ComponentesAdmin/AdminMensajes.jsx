import { useState, useEffect } from 'react';
import { ConfirmModal } from './AdminModals';
import ExportCSV from './ExportCSV';

function AdminMensajes({ token }) {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  useEffect(() => {
    fetchMensajes();
  }, []);

  const fetchMensajes = async () => {
    try {
      const res = await fetch('/api/contacto', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      const res = await fetch(`/api/contacto/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMensajes(mensajes.filter(m => m.id !== id));
        setConfirmarEliminar(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const csvHeaders = [
    { label: 'ID', accessor: m => m.id },
    { label: 'Nombre', accessor: m => m.nombre },
    { label: 'Email', accessor: m => m.email },
    { label: 'Teléfono', accessor: m => m.telefono || '' },
    { label: 'Mensaje', accessor: m => m.mensaje },
    { label: 'Fecha', accessor: m => new Date(m.creadoEn).toLocaleString('es-PE') }
  ];

  if (cargando) return <div className="admin-tab-loading">Cargando mensajes...</div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3>Mensajes de Contacto</h3>
        <ExportCSV data={mensajes} headers={csvHeaders} filename="mensajes_lecco" />
      </div>

      {mensajes.length === 0 ? (
        <div className="admin-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="#cbd5e1" strokeWidth="1.5" fill="none" style={{ marginBottom: 12 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <p>No hay mensajes de contacto</p>
        </div>
      ) : (
        <div className="mensajes-grid">
          {mensajes.map(msg => (
            <div key={msg.id} className="mensaje-card">
              <div className="mensaje-card-header">
                <div className="mensaje-avatar">
                  {msg.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="mensaje-info">
                  <span className="mensaje-nombre">{msg.nombre}</span>
                  <span className="mensaje-email">{msg.email}</span>
                </div>
                <button
                  className="btn-accion btn-eliminar"
                  onClick={() => setConfirmarEliminar(msg)}
                  title="Eliminar mensaje"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
              {msg.telefono && (
                <div className="mensaje-telefono">📞 {msg.telefono}</div>
              )}
              <p className="mensaje-texto">{msg.mensaje}</p>
              <div className="mensaje-fecha">
                {new Date(msg.creadoEn).toLocaleString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmarEliminar && (
        <ConfirmModal
          mensaje={`¿Eliminar el mensaje de "${confirmarEliminar.nombre}"?`}
          onConfirm={() => handleEliminar(confirmarEliminar.id)}
          onCancel={() => setConfirmarEliminar(null)}
        />
      )}
    </div>
  );
}

export default AdminMensajes;
