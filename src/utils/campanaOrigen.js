// Atribución de ventas a campañas: los enlaces de Brevo llevan ?utm_campaign=<slug>.
// Se guarda en la sesión del navegador y se envía con el pedido (Pedido.origenCampana).
const CLAVE = 'lecco-campana-origen';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const capturarCampanaDeUrl = (search = window.location.search) => {
    try {
        const slug = new URLSearchParams(search).get('utm_campaign')?.trim().toLowerCase();
        if (slug && slug.length <= 60 && SLUG.test(slug)) {
            sessionStorage.setItem(CLAVE, slug);
        }
    } catch {
        // sessionStorage no disponible (modo privado estricto): sin atribución
    }
};

export const obtenerCampanaOrigen = () => {
    try {
        return sessionStorage.getItem(CLAVE) || null;
    } catch {
        return null;
    }
};

export const enlaceCampana = (slug, origen = window.location.origin) =>
    `${origen}/campanas/${slug}?utm_source=brevo&utm_medium=email&utm_campaign=${slug}`;
