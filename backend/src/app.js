import express from 'express';
import cors from 'cors';

import productosRoutes from './routes/productos.js';
import usuariosRoutes from './routes/usuarios.js';
import pedidosRoutes from './routes/pedidos.js';
import historialRoutes from './routes/historial.js';
import contactoRoutes from './routes/contacto.js';
import statsRoutes from './routes/stats.js';
import uploadRoutes from './routes/upload.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());// para que el servidor entienda los datos enviados del front 


// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contacto', contactoRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lecco API funcionando' });
});

export default app;
