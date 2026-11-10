import dns from 'dns';
// Render no soporta IPv6 saliente — forzamos IPv4 para SMTP y otras conexiones externas
dns.setDefaultResultOrder('ipv4first');


import dotenv from 'dotenv';


dotenv.config();

import app from './src/app.js';




const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);


app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
