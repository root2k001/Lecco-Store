import { BACKEND_URL } from './src/lib/backendUrl.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Imagen Docker ligera (node server.js); en Vercel no se usa
    output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
    poweredByHeader: false,

    // Proxy de /api al backend Express: mismas cookies de sesión (mismo origen)
    async rewrites() {
        return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
    },

    async redirects() {
        return [
            // La pestaña Colección ya no existe: su URL lleva al catálogo completo
            { source: '/Coleccion', destination: '/Lentes', permanent: true }
        ];
    }
};

export default nextConfig;
