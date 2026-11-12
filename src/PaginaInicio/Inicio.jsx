import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Cabecera from '../Compartidos/cabecera/cabecera';
import PiePagina from '../Compartidos/footer/Footer';
import styles from './Inicio.module.css';

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
    <div className={styles['categoria-carrusel-container']}>
      {imagenes.map((img, i) => (
        <img
          key={i}
          src={img}
          alt="Categoria"
          className={`${styles['categoria-carrusel-img']} ${i === idx ? styles['active'] : ''}`}
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
    <div className={`${styles['inicio-pagina'] || 'inicio-pagina'}`}>
      <Cabecera />

      {/* HERO SECTION */}
      <section className={`${styles['hero-section'] || 'hero-section'}`}>
        <div className={`${styles['hero-background'] || 'hero-background'}`}></div>
        <div className={`${styles['hero-overlay'] || 'hero-overlay'}`}></div>
        <div className={`${styles['hero-content'] || 'hero-content'}`}>
          <h1 className={`${styles['hero-title'] || 'hero-title'}`}>Lecco</h1>
          <p className={`${styles['hero-subtitle'] || 'hero-subtitle'}`}>El estilo perfecto empieza por tu mirada</p>
          <Link to="/Coleccion" className={`${styles['hero-btn'] || 'hero-btn'}`}>Ver Colección</Link>
        </div>
      </section>



      {/* CATEGORIES SECTION 
      PENDIENTE REVISAR  CODIGO ULTIMA MODIFICACION 12/11/26
     
      */}
      <section className={`${styles['categorias-section'] || 'categorias-section'}`}>
        <h2 className={`${styles['section-title'] || 'section-title'}`}>Encuentra tu estilo</h2>
        <div className={`${styles['categorias-grid'] || 'categorias-grid'}`}>
          <Link to="/Coleccion" className={`${styles['categoria-card'] || 'categoria-card'}`}>
            <CategoriaCarrusel
              imagenes={todosLosProductos.filter(p => p.genero === 'unisex' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)}
              fallbackClass="unisex-bg"
            />
            <div className={`${styles['categoria-info'] || 'categoria-info'}`}>
              <span className={`${styles['categoria-link'] || 'categoria-link'}`}>Explorar →</span>
            </div>
          </Link>
          <Link to="/Coleccion" className={`${styles['categoria-card'] || 'categoria-card'}`}>
            <CategoriaCarrusel
              imagenes={todosLosProductos.filter(p => p.genero === 'unisex' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)}
              fallbackClass="unisex-bg"
            />
            <div className={`${styles['categoria-info'] || 'categoria-info'}`}>
              <span className={`${styles['categoria-link'] || 'categoria-link'}`}>Explorar →</span>
            </div>
          </Link>
          <Link to="/Coleccion" className={`${styles['categoria-card'] || 'categoria-card'}`}>
            <CategoriaCarrusel
              imagenes={todosLosProductos.filter(p => p.genero === 'unisex' && p.imagen && p.imagen !== 'en proceso').map(p => p.imagen)}
              fallbackClass="unisex-bg"
            />
            <div className={`${styles['categoria-info'] || 'categoria-info'}`}>
              <span className={`${styles['categoria-link'] || 'categoria-link'}`}>Explorar →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* DESTACADOS SECTION */}
      <section className={`${styles['destacados-section'] || 'destacados-section'}`}>
        <div className={`${styles['destacados-header'] || 'destacados-header'}`}>
          <h2 className={`${styles['section-title'] || 'section-title'}`}>Nuevos Ingresos</h2>
          <Link to="/Coleccion" className={`${styles['link-ver-todo'] || 'link-ver-todo'}`}>Ver todos</Link>
        </div>

        {loading ? (
          <div className={`${styles['destacados-grid'] || 'destacados-grid'} ${styles['skeleton-grid'] || 'skeleton-grid'}`}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`${styles['producto-skeleton'] || 'producto-skeleton'}`}>
                <div className={`${styles['skeleton-imagen'] || 'skeleton-imagen'}`}></div>
                <div className={`${styles['skeleton-texto'] || 'skeleton-texto'}`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${styles['destacados-grid'] || 'destacados-grid'}`}>
            {productosDestacados.map(prod => (
              <Link to="/Coleccion" key={prod.id} className={`${styles['destacado-card'] || 'destacado-card'}`}>
                <div className={`${styles['destacado-img-wrapper'] || 'destacado-img-wrapper'}`}>
                  {prod.imagen && prod.imagen !== 'en proceso' ? (
                    <img src={prod.imagen} alt={prod.nombre} />
                  ) : (
                    <div className={`${styles['imagen-placeholder'] || 'imagen-placeholder'}`}>👓</div>
                  )}
                </div>
                <div className={`${styles['destacado-info'] || 'destacado-info'}`}>
                  <h4>{prod.nombre}</h4>
                  <p>S/ {Number(prod.precio).toLocaleString('es-PE')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>



      <PiePagina />
    </div>
  );
}

export default Inicio;