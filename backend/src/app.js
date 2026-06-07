import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productosRoutes from './routes/productos.js';
import usuariosRoutes from './routes/usuarios.js';
import pedidosRoutes from './routes/pedidos.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());// para que el servidor entienda los datos enviados del front 


// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lecco API funcionando' });
});

export default app;
