import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { enlaceCampana } from '../utils/campanaOrigen.js';
import './AdminCampanas.css';

// ── Peticiones ──────────────────────────────────────────────────────────────
const obtenerCampanas = async () => {
  const res = await fetch('/api/campanas', { credentials: 'include' });
  if (!res.ok) throw new Error('No se pudieron cargar las campañas');
  return res.json();
};

// Todos los productos (la API pagina de 50 en 50) para poder asignarlos a la campaña
const obtenerTodosLosProductos = async () => {
  const todos = [];
  for (let pagina = 1; pagina <= 40; pagina++) {
    const res = await fetch(`/api/productos?page=${pagina}&limit=50`);
    if (!res.ok) throw new Error('No se pudieron cargar los productos');
    const data = await res.json();
    todos.push(...(data.productos || []));
    if (pagina >= (data.totalPages || 1)) break;
  }
  return todos;
};

// ── Fechas: el formulario usa días (YYYY-MM-DD); la campaña dura el día completo ──
const aInputFecha = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const inicioDelDia = (dia) => new Date(`${dia}T00:00:00`).toISOString();
const finDelDia = (dia) => new Date(`${dia}T23:59:59`).toISOString();

const estadoCampana = (campana, ahora = new Date()) => {
  if (!campana.activa) return { texto: 'Pausada', clase: 'pausada' };
  if (new Date(campana.inicio) > ahora) return { texto: 'Programada', clase: 'programada' };
  if (new Date(campana.fin) < ahora) return { texto: 'Finalizada', clase: 'finalizada' };
  return { texto: 'Vigente', clase: 'vigente' };
};

const slugDesdeTitulo = (titulo) => titulo
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

const FORM_VACIO = { id: null, titulo: '', slug: '', descripcion: '', banner: '', inicio: '', fin: '', activa: true, productoIds: [] };

// ── Formulario (modal) ──────────────────────────────────────────────────────
function FormularioCampana({ inicial, productos, onCerrar, onGuardado }) {
  const [form, setForm] = useState(inicial);
  const [slugEditado, setSlugEditado] = useState(Boolean(inicial.id));
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cambiar = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const cambiarTitulo = (titulo) => setForm(prev => ({
    ...prev,
    titulo,
    // El identificador se sugiere a partir del título hasta que el admin lo edite
    slug: slugEditado ? prev.slug : slugDesdeTitulo(titulo)
  }));

  const alternarProducto = (id) => setForm(prev => ({
    ...prev,
    productoIds: prev.productoIds.includes(id)
      ? prev.productoIds.filter(p => p !== id)
      : [...prev.productoIds, id]
  }));

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? productos.filter(p => p.nombre.toLowerCase().includes(q)) : productos;
  }, [productos, busqueda]);

  const subirBanner = async (archivo) => {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setError('El banner debe ser una imagen (JPG, PNG, WebP o GIF).');
      return;
    }
    setSubiendo(true);
    setError('');
    try {
      const datos = new FormData();
      datos.append('imagen', archivo);
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: datos });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen');
      cambiar('banner', data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.inicio || !form.fin) {
      setError('Indica la fecha de inicio y de fin.');
      return;
    }
    setGuardando(true);
    try {
      const cuerpo = {
        titulo: form.titulo,
        slug: form.slug,
        descripcion: form.descripcion,
        banner: form.banner,
        inicio: inicioDelDia(form.inicio),
        fin: finDelDia(form.fin),
        activa: form.activa,
        productoIds: form.productoIds
      };
      const res = await fetch(form.id ? `/api/campanas/${form.id}` : '/api/campanas', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cuerpo)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la campaña');
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onCerrar}>
      <div className="admin-modal campana-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{form.id ? 'Editar campaña' : 'Nueva campaña'}</h3>
          <button type="button" className="admin-modal-cerrar" onClick={onCerrar}>×</button>
        </div>

        <form className="admin-modal-body" onSubmit={guardar}>
          {error && <div className="admin-modal-error" role="alert">{error}</div>}
          <div className="admin-form-group">
            <label htmlFor="campana-titulo">Título</label>
            <input id="campana-titulo" required value={form.titulo} onChange={e => cambiarTitulo(e.target.value)} placeholder="Colección de Verano" />
          </div>

          <div className="admin-form-group">
            <label htmlFor="campana-slug">Identificador (URL y utm_campaign)</label>
            <input
              id="campana-slug"
              required
              value={form.slug}
              onChange={e => { setSlugEditado(true); cambiar('slug', e.target.value); }}
              placeholder="verano-2027"
            />
            <small className="campana-ayuda">/campanas/{form.slug || 'verano-2027'}</small>
          </div>

          <div className="admin-form-group">
            <label htmlFor="campana-descripcion">Descripción (opcional)</label>
            <textarea id="campana-descripcion" rows={2} value={form.descripcion} onChange={e => cambiar('descripcion', e.target.value)} />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="campana-inicio">Inicio</label>
              <input id="campana-inicio" type="date" required value={form.inicio} onChange={e => cambiar('inicio', e.target.value)} />
            </div>
            <div className="admin-form-group">
              <label htmlFor="campana-fin">Fin</label>
              <input id="campana-fin" type="date" required value={form.fin} onChange={e => cambiar('fin', e.target.value)} />
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="campana-banner">Banner (opcional)</label>
            <div className="campana-banner-fila">
              <input id="campana-banner" type="url" value={form.banner} onChange={e => cambiar('banner', e.target.value)} placeholder="https://..." />
              <label className="btn-accion campana-subir">
                {subiendo ? 'Subiendo...' : 'Subir imagen'}
                <input type="file" accept="image/*" hidden disabled={subiendo} onChange={e => subirBanner(e.target.files?.[0])} />
              </label>
            </div>
            {form.banner && <img className="campana-banner-preview" src={form.banner} alt="Vista previa del banner" />}
          </div>

          <label className="campana-check">
            <input type="checkbox" checked={form.activa} onChange={e => cambiar('activa', e.target.checked)} />
            Activa (si la desmarcas, la campaña se oculta aunque esté dentro de sus fechas)
          </label>

          <div className="admin-form-group">
            <label>Productos de la campaña ({form.productoIds.length} seleccionados)</label>
            <input type="search" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <div className="campana-productos">
              {productosFiltrados.length === 0 ? (
                <p className="campana-ayuda">No hay productos que coincidan.</p>
              ) : productosFiltrados.map(p => (
                <label key={p.id} className="campana-producto">
                  <input type="checkbox" checked={form.productoIds.includes(p.id)} onChange={() => alternarProducto(p.id)} />
                  <span>{p.nombre}</span>
                  <span className="campana-producto-precio">S/ {Number(p.precio).toLocaleString('es-PE')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn-modal-cancelar" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn-modal-guardar" disabled={guardando || subiendo}>
              {guardando ? 'Guardando...' : 'Guardar campaña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pestaña "Campañas" del panel ────────────────────────────────────────────
function AdminCampanas() {
  const queryClient = useQueryClient();
  const [formulario, setFormulario] = useState(null);
  const [copiado, setCopiado] = useState(null);

  const { data: campanas = [], isPending, error } = useQuery({ queryKey: ['admin', 'campanas'], queryFn: obtenerCampanas });
  const { data: productos = [] } = useQuery({ queryKey: ['admin', 'productos-todos'], queryFn: obtenerTodosLosProductos });

  // Tras guardar o borrar: refrescar el panel y también la tienda (cabecera, inicio, catálogo)
  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'campanas'] });
    queryClient.invalidateQueries({ queryKey: ['campanas'] });
    queryClient.invalidateQueries({ queryKey: ['productos'] });
  };

  const editar = (c) => setFormulario({
    id: c.id,
    titulo: c.titulo,
    slug: c.slug,
    descripcion: c.descripcion || '',
    banner: c.banner || '',
    inicio: aInputFecha(c.inicio),
    fin: aInputFecha(c.fin),
    activa: c.activa,
    productoIds: c.productos.map(p => p.id)
  });

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar la campaña "${c.titulo}"? Los productos no se borran.`)) return;
    const res = await fetch(`/api/campanas/${c.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) refrescar();
    else window.alert('No se pudo eliminar la campaña.');
  };

  const copiarEnlace = async (c) => {
    try {
      await navigator.clipboard.writeText(enlaceCampana(c.slug));
      setCopiado(c.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      window.prompt('Copia el enlace para tu correo de Brevo:', enlaceCampana(c.slug));
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h3>Campañas</h3>
        <div className="admin-section-actions">
          <button className="btn-nuevo" onClick={() => setFormulario(FORM_VACIO)}>+ Nueva campaña</button>
        </div>
      </div>

      <p className="campana-ayuda campana-intro">
        Cada campaña vigente aparece como pestaña en la tienda, con carrusel en el inicio y página propia.
        Usa "Copiar enlace Brevo" en tus correos: las ventas que lleguen por ese enlace se atribuyen a la campaña en el Dashboard.
      </p>

      {error && <div className="campana-error">{error.message}</div>}

      {isPending ? (
        <div className="admin-empty">Cargando campañas...</div>
      ) : campanas.length === 0 ? (
        <div className="admin-empty">Aún no hay campañas. Crea la primera, por ejemplo "Colección de Verano".</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Fechas</th>
              <th>Estado</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {campanas.map(c => {
              const estado = estadoCampana(c);
              return (
                <tr key={c.id}>
                  <td>
                    <div className="pedido-cliente">
                      <span className="pedido-cliente-nombre">{c.titulo}</span>
                      <span className="pedido-cliente-email">/campanas/{c.slug}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(c.inicio).toLocaleDateString('es-PE')} – {new Date(c.fin).toLocaleDateString('es-PE')}
                  </td>
                  <td><span className={`campana-estado-badge ${estado.clase}`}>{estado.texto}</span></td>
                  <td>{c.productos.length}</td>
                  <td>
                    <div className="campana-acciones">
                      <button className="btn-accion btn-editar" onClick={() => editar(c)}>Editar</button>
                      <button className="btn-accion" onClick={() => copiarEnlace(c)}>
                        {copiado === c.id ? '¡Copiado!' : 'Copiar enlace Brevo'}
                      </button>
                      <button className="btn-accion btn-eliminar" onClick={() => eliminar(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {formulario && (
        <FormularioCampana
          inicial={formulario}
          productos={productos}
          onCerrar={() => setFormulario(null)}
          onGuardado={() => { setFormulario(null); refrescar(); }}
        />
      )}
    </div>
  );
}

export default AdminCampanas;
