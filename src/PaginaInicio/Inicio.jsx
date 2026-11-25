import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { CLAVE_CAMPANAS_ACTIVAS, obtenerCampanasActivas, obtenerProductosDeCampana } from '../utils/campanasApi.js';
import Cabecera from '../Compartidos/cabecera/cabecera';
import PiePagina from '../Compartidos/footer/Footer';
import DetalleProducto from '../PaginaCatalogo/DetallesProductos/DetallesProductos.jsx';
import { mapearProducto } from '../PaginaCatalogo/mapearProducto.js';
import styles from './Inicio.module.css';


const obtenerImagenesValidas = (lista, predicado) => {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((p) => predicado(p) && p.imagen && p.imagen !== 'en proceso')
    .map((p) => p.imagen);
};




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

function CarruselProductos({ titulo, productos, loading, enlaceRuta = '/Lentes', onSeleccionarProducto }) {
  const pistaCarruselRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const estadoArrastre = useRef({
    activo: false,
    inicioX: 0,
    scrollInicial: 0,
    seMovio: false,
  });

  const manejarMouseDown = (e) => {
    const pista = pistaCarruselRef.current;
    if (!pista) return;

    estadoArrastre.current = {
      activo: true,
      inicioX: e.pageX - pista.offsetLeft,
      scrollInicial: pista.scrollLeft,
      seMovio: false,
    };
    setArrastrando(true);
  };

  const manejarMouseMove = (e) => {
    if (!estadoArrastre.current.activo) return;
    const pista = pistaCarruselRef.current;
    if (!pista) return;

    e.preventDefault();
    const x = e.pageX - pista.offsetLeft;
    const distancia = x - estadoArrastre.current.inicioX;

    // Si se desplazó más de 5px, se considera arrastre y no un clic normal
    if (Math.abs(distancia) > 5) {
      estadoArrastre.current.seMovio = true;
    }

    pista.scrollLeft = estadoArrastre.current.scrollInicial - distancia * 1.2;
  };

  const detenerArrastre = () => {
    if (!estadoArrastre.current.activo) return;
    estadoArrastre.current.activo = false;
    setArrastrando(false);
  };



  // Evita que se abra el detalle del producto si el usuario estaba arrastrando
  const manejarClickCaptura = (e) => {
    if (estadoArrastre.current.seMovio) {
      e.preventDefault();
      e.stopPropagation();
      estadoArrastre.current.seMovio = false;
    }
  };

  if (!loading && (!productos || productos.length === 0)) return null;

  return (
    <section className={styles['seccion-coleccion']}>
      <div className={styles['encabezado-coleccion']}>
        <h2 className={styles['titulo-coleccion']}>{titulo}</h2>
        <Link to={enlaceRuta} className={styles['enlace-ver-todo']}>
          Ver todos
        </Link>
      </div>

      <div className={styles['contenedor-carrusel']}>
        {loading ? (
          <div className={styles['pista-carrusel']}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles['tarjeta-coleccion']}>
                <div className={styles['esqueleto-celda']} />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={pistaCarruselRef}
            onMouseDown={manejarMouseDown}
            onMouseMove={manejarMouseMove}
            onMouseUp={detenerArrastre}
            onMouseLeave={detenerArrastre}
            onClickCapture={manejarClickCaptura}
            className={`${styles['pista-carrusel']} ${arrastrando ? styles['arrastrando'] : ''
              }`}
          >
            {productos.map((prod) => (
              // Al hacer clic se abre directamente el detalle del producto
              <div
                key={prod.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver ${prod.nombre}`}
                draggable={false}
                className={styles['tarjeta-coleccion']}
                onClick={() => onSeleccionarProducto(prod)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSeleccionarProducto(prod);
                  }
                }}
              >
                <div className={styles['contenedor-imagen-coleccion']}>
                  {prod.imagen && prod.imagen !== 'en proceso' ? (
                    <img
                      src={prod.imagen}
                      alt={prod.nombre}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className={styles['marcador-imagen']}>👓</div>
                  )}
                </div>

                <div className={styles['info-coleccion']}>
                  <h4>{prod.nombre}</h4>
                  <span>S/ {Number(prod.precio).toLocaleString('es-PE')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Inicio() {
  const [productosDestacados, setProductosDestacados] = useState([]);
  const [todosLosProductos, setTodosLosProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productosColeccion, setProductosColeccion] = useState([]);
  const [productosSale, setProductosSale] = useState([]);
  // Producto abierto en el detalle (null = cerrado)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const abrirDetalle = (prod) => setProductoSeleccionado(mapearProducto(prod));
  // La pestaña Colección ya no existe: sus productos llevan al catálogo completo
  const navigate = useNavigate();
  const irALentes = () => navigate('/Lentes');

  // Campaña vigente (ej. Colección de Verano): se destaca con su propio carrusel
  const { data: campanasActivas = [] } = useQuery({
    queryKey: CLAVE_CAMPANAS_ACTIVAS,
    queryFn: obtenerCampanasActivas,
    staleTime: 5 * 60 * 1000
  });
  const campanaDestacada = campanasActivas[0];
  const { data: productosCampana = [], isPending: cargandoCampana } = useQuery({
    queryKey: ['productos', 'campana-inicio', campanaDestacada?.slug],
    queryFn: () => obtenerProductosDeCampana(campanaDestacada.slug),
    enabled: Boolean(campanaDestacada),
    staleTime: 60 * 1000
  });

  // Al confirmar la newsletter, Brevo redirige a /?suscripcion=confirmada
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  useEffect(() => {
    if (searchParams.get('suscripcion') === 'confirmada') {
      addToast('¡Suscripción confirmada! Te avisaremos de ofertas y nuevas colecciones.', 'success');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, addToast]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const [resGeneral, resColeccion, resSale] = await Promise.all([
          fetch('/api/productos?page=1&limit=50'),
          fetch('/api/productos?coleccion=true&page=1&limit=20'),
          fetch('/api/productos?sale=true&page=1&limit=20')
        ]);

        const dataGeneral = await resGeneral.json();
        const lista = dataGeneral.productos || dataGeneral;
        setTodosLosProductos(lista);

        // 12 productos para que el carrusel de Nuevos Ingresos tenga recorrido horizontal
        setProductosDestacados(lista.slice(0, 12));

        const dataColeccion = await resColeccion.json();
        setProductosColeccion(dataColeccion.productos || dataColeccion);

        const dataSale = await resSale.json();
        setProductosSale(dataSale.productos || dataSale);
      } catch (err) {
        console.error('Error cargando productos', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
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



      {/* CATEGORIES SECTION */}
      <section className={styles?.['categorias-section'] || 'categorias-section'}>
        <h2 className={styles?.['section-title'] || 'section-title'}>Encuentra tu estilo</h2>
        <div className={styles?.['categorias-grid'] || 'categorias-grid'}>
          <Link
            to="/Lentes"
            className={styles?.['categoria-card'] || 'categoria-card'}
          >
            <CategoriaCarrusel
              imagenes={obtenerImagenesValidas(todosLosProductos, (p) => p.genero === "unisex")}
              fallbackClass="unisex-bg"
            />
            <div className={styles?.['categoria-info'] || 'categoria-info'}>
              <span className={styles?.['categoria-link'] || 'categoria-link'}>Explorar →</span>
            </div>
          </Link>

          <Link
            to="/Lentes"
            className={styles?.['categoria-card'] || 'categoria-card'}
          >
            <CategoriaCarrusel
              imagenes={obtenerImagenesValidas(todosLosProductos, (p) => p.genero === "unisex")}
              fallbackClass="unisex-bg"
            />
            <div className={styles?.['categoria-info'] || 'categoria-info'}>
              <span className={styles?.['categoria-link'] || 'categoria-link'}>Explorar →</span>
            </div>
          </Link>

          <Link
            to="/Lentes"
            className={styles?.['categoria-card'] || 'categoria-card'}
          >
            <CategoriaCarrusel
              imagenes={obtenerImagenesValidas(todosLosProductos, (p) => p.genero === "unisex")}
              fallbackClass="unisex-bg"
            />
            <div className={styles?.['categoria-info'] || 'categoria-info'}>
              <span className={styles?.['categoria-link'] || 'categoria-link'}>Explorar →</span>
            </div>
          </Link>
        </div>
      </section>


      {/* CARRUSEL DE LA CAMPAÑA VIGENTE */}
      {campanaDestacada && (
        <CarruselProductos
          titulo={campanaDestacada.titulo}
          enlaceRuta={`/campanas/${campanaDestacada.slug}`}
          productos={productosCampana}
          loading={cargandoCampana}
          onSeleccionarProducto={abrirDetalle}
        />
      )}

      {/* CARRUSEL NUEVOS INGRESOS */}
      <CarruselProductos
        titulo="Nuevos Ingresos"
        enlaceRuta="/Lentes"
        productos={productosDestacados}
        loading={loading}
        onSeleccionarProducto={abrirDetalle}
      />

      {/* CARRUSEL COLECCIÓN */}
      <CarruselProductos
        titulo="Colección"
        enlaceRuta="/Lentes"
        productos={productosColeccion}
        loading={loading}
        onSeleccionarProducto={irALentes}
      />

      {/* CARRUSEL SALE */}
      <CarruselProductos
        titulo="Sale"
        enlaceRuta="/Sale"
        productos={productosSale}
        loading={loading}
        onSeleccionarProducto={abrirDetalle}
      />

      <PiePagina />

      {productoSeleccionado && (
        <DetalleProducto
          producto={productoSeleccionado}
          onCerrar={() => setProductoSeleccionado(null)}
        />
      )}
    </div>
  );
}

export default Inicio;