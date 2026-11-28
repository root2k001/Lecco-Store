// Renderiza una ruta de la tienda con los Providers REALES de la app (src/app/providers.jsx).
// Equivale a lo que hacía <App /> con React Router: misma página cliente para cada URL.
import { render } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import Providers from '../app/providers.jsx';
import Inicio from '../PaginaInicio/Inicio.jsx';
import Lentes from '../PaginaCatalogo/Lentes.jsx';
import Sale from '../PaginaCatalogo/Sale.jsx';
import Campana from '../PaginaCatalogo/Campana.jsx';
import CarritoMain from '../PaginaCarrito/mainCarrito.jsx';
import PagoResultado from '../PaginaCarrito/PagoResultado.jsx';
import Nosotros from '../PaginaInformacion/Nosotros.jsx';
import NotFound from '../PaginaInformacion/NotFound.jsx';
import { navegacion } from './navegacion.js';

const paginaDe = (ruta) => {
    if (ruta === '/') return <Inicio />;
    if (ruta === '/Lentes') return <Lentes />;
    if (ruta === '/Sale') return <Sale />;
    if (ruta === '/Carrito') return <CarritoMain />;
    if (ruta === '/Nosotros') return <Nosotros />;
    if (ruta === '/pago/resultado') return <PagoResultado />;
    const campana = /^\/campanas\/([^/]+)$/.exec(ruta);
    if (campana) return <Campana slug={decodeURIComponent(campana[1])} />;
    return <NotFound />;
};

export const nuevoClienteTest = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

export function renderRuta(url, { queryClient = nuevoClienteTest() } = {}) {
    navegacion.ir(url, 'inicial');
    return render(
        <Providers queryClient={queryClient}>
            {paginaDe(navegacion.ruta)}
        </Providers>
    );
}

// Para componentes sueltos que necesitan los contexts de la app
export function renderConProviders(ui, { queryClient = nuevoClienteTest() } = {}) {
    return render(<Providers queryClient={queryClient}>{ui}</Providers>);
}
