import { useState, useRef } from 'react';

/**
 * Modal reutilizable para Crear / Editar un producto
 * Con zona de Drag & Drop para subir imágenes a Cloudinary
 */
function ProductoModal({ producto, onClose, onSave, token }) {
  const esEdicion = !!producto;

  const [form, setForm] = useState({
    nombre: producto?.nombre || '',
    precio: producto?.precio || '',
    stock: producto?.stock ?? 0,
    genero: producto?.genero || 'unisex',
    descripcion: producto?.descripcion || '',
    imagen: producto?.imagen || '',
    imagenesAdicionales: producto?.imagenesAdicionales || [],
    videos: producto?.videos || []
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Estados para el upload de imagen
  const [subiendo, setSubiendo] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState('');
  const [dragActivo, setDragActivo] = useState(false);
  const [modoUrl, setModoUrl] = useState(false);
  const inputFileRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // --- Subir archivo a Cloudinary vía /api/upload ---
  const subirArchivo = async (file) => {
    if (!file) return;

    // Validar tipo
    const tiposPermitidos = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP, GIF) o videos (MP4, WebM, OGG, MOV)');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxTamanio = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024; // 20MB para video, 5MB para imagen
    if (file.size > maxTamanio) {
      setError(isVideo ? 'El video es demasiado grande. Máximo 20MB.' : 'La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    setSubiendo(true);
    setError('');
    setProgresoTexto(isVideo ? 'Subiendo video...' : 'Subiendo imagen...');

    try {
      const formData = new FormData();
      formData.append('imagen', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al subir el archivo');
      }

      const data = await res.json();

      setForm(prev => {
        if (isVideo) {
          return { ...prev, videos: [...prev.videos, data.url] };
        } else {
          if (!prev.imagen) {
            return { ...prev, imagen: data.url };
          } else {
            return { ...prev, imagenesAdicionales: [...prev.imagenesAdicionales, data.url] };
          }
        }
      });

      setProgresoTexto(isVideo ? '¡Video subido!' : '¡Imagen subida!');
      setTimeout(() => setProgresoTexto(''), 2000);
    } catch (err) {
      setError(err.message);
      setProgresoTexto('');
    } finally {
      setSubiendo(false);
    }
  };

  // --- Drag & Drop handlers ---
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await subirArchivo(files[i]);
      }
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await subirArchivo(files[i]);
      }
    }
  };

  // --- Submit del formulario ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) return setError('El nombre es obligatorio');
    if (!form.precio || Number(form.precio) <= 0) return setError('El precio debe ser mayor a 0');
    if (form.stock < 0) return setError('El stock no puede ser negativo');

    setGuardando(true);

    try {
      const url = esEdicion
        ? `/api/productos/${producto.id}`
        : '/api/productos';

      const res = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          precio: parseFloat(form.precio),
          stock: parseInt(form.stock),
          genero: form.genero,
          descripcion: form.descripcion.trim(),
          imagen: form.imagen.trim() || null,
          imagenesAdicionales: form.imagenesAdicionales,
          videos: form.videos
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const data = await res.json();
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{esEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="admin-modal-cerrar" onClick={onClose}>×</button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {error && <div className="admin-modal-error">{error}</div>}

          <div className="admin-form-group">
            <label>Nombre del producto</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Gafas Aviador Premium"
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Precio (S/)</label>
              <input
                type="number"
                name="precio"
                value={form.precio}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="admin-form-group">
              <label>Stock</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="admin-form-group">
              <label>Género</label>
              <select name="genero" value={form.genero} onChange={handleChange}>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
          </div>

          {/* ===== ZONA DE IMAGEN ===== */}
          <div className="admin-form-group">
            <div className="imagen-label-row">
              <label>Imagen del producto</label>
              <button
                type="button"
                className="btn-toggle-url"
                onClick={() => setModoUrl(!modoUrl)}
              >
                {modoUrl ? 'Subir archivo' : 'Pegar URL'}
              </button>
            </div>

            {modoUrl ? (
              /* Modo URL manual */
              <div className="manual-urls-container">
                <div className="manual-url-row">
                  <label>Imagen Principal (Portada)</label>
                  <input
                    type="text"
                    name="imagen"
                    value={form.imagen}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com/portada.jpg"
                  />
                </div>
                <div className="manual-url-row">
                  <label>Imágenes Adicionales (separadas por coma)</label>
                  <textarea
                    value={form.imagenesAdicionales.join(', ')}
                    onChange={(e) => {
                      const urls = e.target.value.split(',').map(u => u.trim()).filter(Boolean);
                      setForm(prev => ({ ...prev, imagenesAdicionales: urls }));
                    }}
                    placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg"
                    rows="2"
                  />
                </div>
                <div className="manual-url-row">
                  <label>Videos (separados por coma)</label>
                  <textarea
                    value={form.videos.join(', ')}
                    onChange={(e) => {
                      const urls = e.target.value.split(',').map(u => u.trim()).filter(Boolean);
                      setForm(prev => ({ ...prev, videos: urls }));
                    }}
                    placeholder="https://ejemplo.com/video1.mp4, https://ejemplo.com/video2.mp4"
                    rows="2"
                  />
                </div>
              </div>
            ) : (
              /* Modo Drag & Drop */
              <>
                {(form.imagen || form.imagenesAdicionales.length > 0 || form.videos.length > 0) && (
                  <div className="media-preview-grid">
                    {/* Imagen Principal */}
                    {form.imagen && (
                      <div className="media-preview-card principal">
                        <span className="media-badge">Principal</span>
                        <img src={form.imagen} alt="Portada" />
                        <button
                          type="button"
                          className="media-preview-remove"
                          onClick={() => {
                            if (form.imagenesAdicionales.length > 0) {
                              const nextPrincipal = form.imagenesAdicionales[0];
                              const rest = form.imagenesAdicionales.slice(1);
                              setForm(prev => ({
                                ...prev,
                                imagen: nextPrincipal,
                                imagenesAdicionales: rest
                              }));
                            } else {
                              setForm(prev => ({ ...prev, imagen: '' }));
                            }
                          }}
                          title="Eliminar portada"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Imágenes Adicionales */}
                    {form.imagenesAdicionales.map((imgUrl, index) => (
                      <div className="media-preview-card" key={`img-add-${index}`}>
                        <img src={imgUrl} alt={`Adicional ${index + 1}`} />
                        <button
                          type="button"
                          className="media-preview-remove"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              imagenesAdicionales: prev.imagenesAdicionales.filter((_, i) => i !== index)
                            }));
                          }}
                          title="Eliminar imagen"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {/* Videos */}
                    {form.videos.map((videoUrl, index) => (
                      <div className="media-preview-card video" key={`vid-${index}`}>
                        <span className="media-badge video">Video</span>
                        <video src={videoUrl} muted playsInline />
                        <button
                          type="button"
                          className="media-preview-remove"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              videos: prev.videos.filter((_, i) => i !== index)
                            }));
                          }}
                          title="Eliminar video"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone */}
                <div
                  className={`upload-dropzone ${dragActivo ? 'dropzone-active' : ''} ${subiendo ? 'dropzone-uploading' : ''} ${(form.imagen || form.imagenesAdicionales.length > 0 || form.videos.length > 0) ? 'dropzone-compact' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !subiendo && inputFileRef.current?.click()}
                >
                  <input
                    ref={inputFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    multiple
                  />

                  {subiendo ? (
                    <div className="dropzone-uploading-content">
                      <div className="upload-spinner" />
                      <span>{progresoTexto}</span>
                    </div>
                  ) : (
                    <>
                      <div className="dropzone-icon">
                        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="dropzone-text">
                        Arrastra imágenes/videos aquí o <span>haz clic para seleccionar</span>
                      </p>
                      <p className="dropzone-hint">Imágenes de hasta 5MB · Videos de hasta 20MB</p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="admin-form-group">
            <label>Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows="3"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn-modal-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-guardar" disabled={guardando || subiendo}>
              {guardando ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Crear producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal de confirmación para eliminar
 */
function ConfirmModal({ mensaje, onConfirm, onCancel }) {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-modal-confirm" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="confirm-icon">
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="#ef4444" strokeWidth="1.5" fill="none">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p style={{ color: '#334155', fontSize: '0.95rem', margin: '16px 0 24px' }}>{mensaje}</p>
          <div className="admin-modal-actions" style={{ justifyContent: 'center' }}>
            <button className="btn-modal-cancelar" onClick={onCancel}>Cancelar</button>
            <button className="btn-modal-eliminar" onClick={onConfirm}>Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ProductoModal, ConfirmModal };
