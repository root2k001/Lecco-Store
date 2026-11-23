import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import productosRoutes from './routes/productos.js';
import usuariosRoutes from './routes/usuarios.js';
import pedidosRoutes from './routes/pedidos.js';
import historialRoutes from './routes/historial.js';

import statsRoutes from './routes/stats.js';
import uploadRoutes from './routes/upload.js';

const app = express();

// Middlewares
app.use(helmet()); // Headers de seguridad HTTP
app.use(cookieParser()); // Parseo de cookies

// Configuración flexible de orígenes permitidos (soporta Docker, localhost y producción)
const rawFrontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:80', 'http://localhost:3000'];
const allowedOrigins = [
  ...rawFrontendOrigins,
  ...(process.env.NODE_ENV !== 'production' ? defaultDevOrigins : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin header Origin (Postman, curl, backend-to-backend, etc.)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));// para que el servidor entienda los datos enviados del front 


// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);


// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lecco API funcionando' });
});

// Middleware global de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

export default app;
