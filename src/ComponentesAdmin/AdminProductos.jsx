import { useState } from 'react';
import { ProductoModal, ConfirmModal } from './AdminModals';
import ExportCSV from './ExportCSV';

function AdminProductos({ productos, token, onReload }) {
  const [modalProducto, setModalProducto] = useState(null); // null = cerrado, {} = nuevo, {id,...} = editar
  const [mostrarModal, setMostrarModal] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const handleNuevo = () => {
    setModalProducto(null);
    setMostrarModal(true);
  };

  const handleEditar = (producto) => {
    setModalProducto(producto);
    setMostrarModal(true);
  };

  const handleSave = () => {
    setMostrarModal(false);
    setModalProducto(null);
    onReload();
  };

  const handleEliminar = async (id) => {
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConfirmarEliminar(null);
        onReload();
      } else {
        try {
          const errorData = await res.json();
          alert(errorData.error || 'Error al eliminar el producto');
        } catch {
          alert('Error al eliminar el producto');
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const actualizarStockRapido = async (id, nuevoStock) => {
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock: parseInt(nuevoStock) })
      });
      if (res.ok) onReload();
    } catch (error) {
      console.error(error);
    }
  };

  const csvHeaders = [
    { label: 'ID', accessor: p => p.id },
    { label: 'Nombre', accessor: p => p.nombre },
    { label: 'Precio', accessor: p => p.precio },
    { label: 'Stock', accessor: p => p.stock },
    { label: 'Género', accessor: p => p.genero },
    { label: 'Descripción', accessor: p => p.descripcion || '' },
    { label: 'Imagen', accessor: p => p.imagen || '' }
  ];

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3>Inventario de Productos</h3>
        <div className="admin-section-actions">
          <ExportCSV data={productos} headers={csvHeaders} filename="productos_lecco" />
          <button className="btn-nuevo" onClick={handleNuevo}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {productos.length === 0 ? (
        <div className="admin-empty">No hay productos registrados</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Género</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(producto => (
              <tr key={producto.id}>
                <td>#{producto.id}</td>
                <td>
                  <div className="producto-thumb">
                    {producto.imagen && producto.imagen !== 'en proceso' ? (
                      <img src={producto.imagen} alt={producto.nombre} />
                    ) : (
                      <span className="thumb-placeholder">👓</span>
                    )}
                  </div>
                </td>
                <td className="td-nombre">{producto.nombre}</td>
                <td className="td-precio">S/ {Number(producto.precio).toLocaleString('es-PE')}</td>
                <td>
                  <span className="genero-badge">{producto.genero}</span>
                </td>
                <td>
                  <div className="stock-inline">
                    <input
                      type="number"
                      className={`stock-input ${producto.stock <= 5 ? 'stock-bajo' : ''}`}
                      defaultValue={producto.stock}
                      min="0"
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (val !== producto.stock) {
                          actualizarStockRapido(producto.id, val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                    />
                    {producto.stock <= 5 && (
                      <span className="stock-alerta-badge">
                        {producto.stock === 0 ? '⚠️' : '⬇'}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="acciones-btns">
                    <button
                      className="btn-accion btn-editar"
                      onClick={() => handleEditar(producto)}
                      title="Editar producto"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn-accion btn-eliminar"
                      onClick={() => setConfirmarEliminar(producto)}
                      title="Eliminar producto"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mostrarModal && (
        <ProductoModal
          producto={modalProducto}
          token={token}
          onClose={() => { setMostrarModal(false); setModalProducto(null); }}
          onSave={handleSave}
        />
      )}

      {confirmarEliminar && (
        <ConfirmModal
          mensaje={`¿Estás seguro de eliminar "${confirmarEliminar.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={() => handleEliminar(confirmarEliminar.id)}
          onCancel={() => setConfirmarEliminar(null)}
        />
      )}
    </div>
  );
}

export default AdminProductos;
