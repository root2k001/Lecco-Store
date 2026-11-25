import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Cabecera from '../Compartidos/cabecera/cabecera.jsx';
import Productos from './ListaProductos/Productos.jsx';
import PiePagina from '../Compartidos/footer/Footer.jsx';
import './Campana.css';

const obtenerCampana = async (slug) => {
    const res = await fetch(`/api/campanas/slug/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null; // no existe, no ha empezado o ya terminó
    if (!res.ok) throw new Error('Error al cargar la campaña');
    return res.json();
};

const fechaLarga = (fecha) =>
    new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });

// Página de una campaña (ej. /campanas/verano-2027): banner + productos de la campaña
function Campana() {
    const { slug } = useParams();
    const { data: campana, isPending, error } = useQuery({
        queryKey: ['campanas', 'slug', slug],
        queryFn: () => obtenerCampana(slug),
        staleTime: 5 * 60 * 1000
    });

    let contenido;
    if (isPending) {
        contenido = <div className="campana-estado">Cargando campaña...</div>;
    } else if (error || !campana) {
        contenido = (
            <div className="campana-estado">
                <h1>Esta campaña no está disponible</h1>
                <p>Puede que haya terminado o que aún no haya empezado.</p>
                <Link to="/Lentes" className="campana-btn">Ver todos los lentes</Link>
            </div>
        );
    } else {
        const subtitulo = [campana.descripcion, `Disponible hasta el ${fechaLarga(campana.fin)}`]
            .filter(Boolean)
            .join(' · ');
        contenido = (
            <>
                {campana.banner && (
                    <div className="campana-banner">
                        <img src={campana.banner} alt={campana.titulo} />
                    </div>
                )}
                <Productos campana={campana.slug} titulo={campana.titulo} subtitulo={subtitulo} />
            </>
        );
    }

    return (
        <div className="Principal-container">
            <Cabecera />
            {contenido}
            <PiePagina />
        </div>
    );
}

export default Campana;
