import dns from 'dns';
// Render no soporta IPv6 saliente — forzamos IPv4 para SMTP y otras conexiones externas
dns.setDefaultResultOrder('ipv4first');


import dotenv from 'dotenv';


dotenv.config();

import app from './src/app.js';




const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Verificación de variables de entorno críticas
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.warn(`[Config] ⚠️ Advertencia: Variables de entorno críticas ausentes: ${missingVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.error('[Config]  Abortando: En producción se requieren todas las variables críticas.');
    process.exit(1);
  }
}

app.set('trust proxy', 1);

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(` Servidor corriendo en http://${displayHost}:${PORT} (Escuchando en ${HOST}:${PORT})`);
});
