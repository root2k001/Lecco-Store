import Nosotros from '../../PaginaInformacion/Nosotros.jsx';

export const metadata = {
    title: 'Nosotros',
    description: 'Conoce la historia detrás de Lecco: gafas de sol seleccionadas por su estilo y calidad, con envío a todo Perú.',
    alternates: { canonical: '/Nosotros' },
    openGraph: { url: '/Nosotros', title: 'Nosotros | Lecco Store' }
};

export default function PaginaNosotros() {
    return <Nosotros />;
}
