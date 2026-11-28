// Simulación de next/navigation y next/link para Vitest (no hay router de Next en happy-dom).
// `navegacion` guarda la ruta actual y el historial para comprobar a dónde se navega.
import { createElement } from 'react';

export const navegacion = {
    ruta: '/',
    busqueda: '',
    historial: [],
    ir(url, modo = 'push') {
        const u = new URL(url, 'http://localhost');
        this.ruta = u.pathname;
        this.busqueda = u.search;
        this.historial.push({ modo, url: u.pathname + u.search });
    },
    reiniciar() {
        this.ruta = '/';
        this.busqueda = '';
        this.historial = [];
    }
};

const router = {
    push: (url) => navegacion.ir(url, 'push'),
    replace: (url) => navegacion.ir(url, 'replace'),
    back() { },
    forward() { },
    refresh() { },
    prefetch() { }
};

class ErrorNavegacion extends Error {
    constructor(tipo, destino) {
        super(`${tipo}${destino ? `:${destino}` : ''}`);
        this.tipo = tipo;
        this.destino = destino;
    }
}

export const moduloNavigation = {
    useRouter: () => router,
    usePathname: () => navegacion.ruta,
    useSearchParams: () => new URLSearchParams(navegacion.busqueda),
    useParams: () => ({}),
    // En Next estas funciones lanzan para cortar el render; aquí igual, con datos comprobables
    notFound: () => { throw new ErrorNavegacion('NOT_FOUND'); },
    redirect: (destino) => { throw new ErrorNavegacion('REDIRECT', destino); },
    permanentRedirect: (destino) => { throw new ErrorNavegacion('PERMANENT_REDIRECT', destino); }
};

// eslint-disable-next-line no-unused-vars -- prefetch/scroll se descartan para no pasarlos al <a>
function Link({ href, children, onClick, replace, prefetch, scroll, ...resto }) {
    return createElement('a', {
        href,
        ...resto,
        onClick: (e) => {
            onClick?.(e);
            if (e.defaultPrevented) return;
            e.preventDefault();
            navegacion.ir(href, replace ? 'replace' : 'push');
        }
    }, children);
}

export const moduloLink = { __esModule: true, default: Link };
