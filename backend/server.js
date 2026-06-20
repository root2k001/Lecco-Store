import dns from 'dns';
// Render no soporta IPv6 saliente — forzamos IPv4 para SMTP y otras conexiones externas
dns.setDefaultResultOrder('ipv4first');

import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
