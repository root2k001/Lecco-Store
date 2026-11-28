import { Suspense } from 'react';
import PagoResultado from '../../../PaginaCarrito/PagoResultado.jsx';

export const metadata = {
    title: 'Resultado del pago',
    robots: { index: false, follow: false }
};

// PagoResultado lee los parámetros de Mercado Pago (useSearchParams)
export default function PaginaPagoResultado() {
    return (
        <Suspense fallback={null}>
            <PagoResultado />
        </Suspense>
    );
}
