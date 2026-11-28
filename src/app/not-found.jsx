import NotFound from '../PaginaInformacion/NotFound.jsx';

export const metadata = {
    title: 'Página no encontrada',
    robots: { index: false, follow: true }
};

export default function PaginaNoEncontrada() {
    return <NotFound />;
}
