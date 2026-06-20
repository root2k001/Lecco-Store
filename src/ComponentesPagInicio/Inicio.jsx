import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Cabecera from '../ComponentesGenerales/cabecera/cabecera';
import PiePagina from '../ComponentesGenerales/footer/Footer';
import './inicio.css';

function CategoriaCarrusel({ imagenes, fallbackClass }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!imagenes || imagenes.length <= 1) return;
    // Rota la imagen cada 3 segundos
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % imagenes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [imagenes]);

  if (!imagenes || imagenes.length === 0) {
    return <div className={`categoria-img-placeholder ${fallbackClass}`}></div>;
  }

  return (
    <div className="categoria-carrusel-container">
      {imagenes.map((img, i) => (
        <img 
          key={i} 
          src={img} 
          alt="Categoria" 
          className={`categoria-carrusel-img ${i === idx ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}

function Inicio() {
  const [productosDestacados, setProductosDestacados] = useState([]);
  const [todosLosProductos, setTodosLosProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestacados = async () => {
      try {
        const res = await fetch('/api/productos?page=1&limit=50');
        const data = await res.json();
        // La API ahora devuelve { productos, total, ... }
        const lista = data.productos || data;
        setTodosLosProductos(lista);
        // Tomamos 4 productos como destacados
        setProductosDestacados(lista.slice(0, 4));
      } catch (err) {
        console.error('Error cargando destacados', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDestacados();
  }, []);

  return (
    <div className="inicio-pagina">
      <Cabecera />

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Lecco</h1>
          <p className="hero-subtitle">El estilo perfecto empieza por tu mirada</p>
          <Link to="/Coleccion" className="hero-btn">Ver Colección</Link>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="categorias-section">
        <h2 className="section-title">Encuentra tu estilo</h2>
        <div className="categorias-grid">
          <Link to="/Coleccion" className="categoria-card">
            <CategoriaCarrusel 
              imagenes={todosLosProductos.filter(p => p.genero === 'hombre' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)} 
              fallbackClass="hombre-bg" 
            />
            <div className="categoria-info">
              <h3>Para Él</h3>
              <span className="categoria-link">Explorar →</span>
            </div>
          </Link>
          <Link to="/Coleccion" className="categoria-card">
            <CategoriaCarrusel 
              imagenes={todosLosProductos.filter(p => p.genero === 'mujer' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)} 
              fallbackClass="mujer-bg" 
            />
            <div className="categoria-info">
              <h3>Para Ella</h3>
              <span className="categoria-link">Explorar →</span>
            </div>
          </Link>
          <Link to="/Coleccion" className="categoria-card">
            <CategoriaCarrusel 
              imagenes={todosLosProductos.filter(p => p.genero === 'unisex' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)} 
              fallbackClass="unisex-bg" 
            />
            <div className="categoria-info">
              <h3>Unisex</h3>
              <span className="categoria-link">Explorar →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* DESTACADOS SECTION */}
      <section className="destacados-section">
        <div className="destacados-header">
          <h2 className="section-title">Nuevos Ingresos</h2>
          <Link to="/Coleccion" className="link-ver-todo">Ver todos</Link>
        </div>

        {loading ? (
          <div className="destacados-grid skeleton-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="producto-skeleton">
                <div className="skeleton-imagen"></div>
                <div className="skeleton-texto"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="destacados-grid">
            {productosDestacados.map(prod => (
              <Link to="/Coleccion" key={prod.id} className="destacado-card">
                <div className="destacado-img-wrapper">
                  {prod.imagen && prod.imagen !== 'en proceso' ? (
                    <img src={prod.imagen} alt={prod.nombre} />
                  ) : (
                    <div className="imagen-placeholder">👓</div>
                  )}
                </div>
                <div className="destacado-info">
                  <h4>{prod.nombre}</h4>
                  <p>S/ {Number(prod.precio).toLocaleString('es-PE')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* STORYTELLING SECTION */}
      <section className="historia-section">
        <div className="historia-content">
          <div className="historia-texto">
            <h2>Artesanía y Diseño Premium</h2>
            <p>
              En Lecco, creemos que las gafas son más que un accesorio: son una extensión de tu personalidad. 
              Cada montura está diseñada con atención al detalle y fabricada con materiales de la más alta calidad 
              para garantizar comodidad y durabilidad sin comprometer el estilo.
            </p>
            <Link to="/Nosotros" className="btn-secundario">Conócenos</Link>
          </div>
          <div className="historia-imagen">
            <img src="/historiaLecco.png" alt="Artesanía y Diseño Premium Lecco" className="historia-img-real" />
          </div>
        </div>
      </section>

      <PiePagina />
    </div>
  );
}

export default Inicio;