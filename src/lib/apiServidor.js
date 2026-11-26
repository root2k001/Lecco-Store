import { BACKEND_URL } from './backendUrl.js';

/**
 * GET al backend desde componentes de servidor (SSR/ISR).
 * Si el backend no responde (p. ej. Render dormido) devuelve null y la página
 * se renderiza igual: los componentes cliente vuelven a pedir los datos.
 */
export async function apiServidor(ruta, { revalidate = 60 } = {}) {
    try {
        const res = await fetch(`${BACKEND_URL}${ruta}`, {
            next: { revalidate },
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Como apiServidor, pero solo devuelve null si el recurso NO existe (404).
 * Ante un fallo del backend lanza un error: con ISR, Next mantiene la última
 * versión buena de la página en vez de publicar un 404 falso.
 */
export async function apiServidorEstricto(ruta, { revalidate = 60 } = {}) {
    const res = await fetch(`${BACKEND_URL}${ruta}`, {
        next: { revalidate },
        signal: AbortSignal.timeout(8000)
    });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error(`Backend respondió ${res.status} en ${ruta}`);
    return res.json();
}
