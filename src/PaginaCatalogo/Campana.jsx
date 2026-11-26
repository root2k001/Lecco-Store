'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Cabecera from '../Compartidos/cabecera/cabecera.jsx';
import Productos from './ListaProductos/Productos.jsx';
import PiePagina from '../Compartidos/footer/Footer.jsx';
import { obtenerCampana } from '../utils/campanasApi.js';
import './Campana.css';

const fechaLarga = (fecha) =>
    new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });

// Página de una campaña (ej. /campanas/verano-2027): banner + productos de la campaña
function Campana({ slug }) {
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
                <Link href="/Lentes" className="campana-btn">Ver todos los lentes</Link>
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
