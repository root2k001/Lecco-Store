/**
 * Prepara la cuenta de Brevo para Lecco Store (idempotente).
 *
 *   pnpm brevo:setup            → solo revisa y muestra qué falta (no cambia nada)
 *   pnpm brevo:setup --aplicar  → crea los atributos y listas que falten
 *
 * Reutiliza las listas "Clientes" y "Newsletter" si ya existen y al final
 * imprime sus IDs para copiar en backend/.env.
 */
import dotenv from 'dotenv';
dotenv.config();

import { llamarBrevo, brevoHabilitado, ORIGEN_VALORES } from '../src/services/brevoService.js';

const APLICAR = process.argv.includes('--aplicar');
const LISTAS = { clientes: 'Clientes', newsletter: 'Newsletter' };
const CARPETA_NUEVA = 'Lecco Store';

// FIRSTNAME viene por defecto en Brevo. ORIGEN es una categoría (registro/newsletter/checkout).
const ATRIBUTOS = {
  NUM_PEDIDOS: { categoria: 'normal', body: { type: 'float' } },
  TOTAL_GASTADO: { categoria: 'normal', body: { type: 'float' } },
  ULTIMA_COMPRA: { categoria: 'normal', body: { type: 'date' } },
  ORIGEN: {
    categoria: 'category',
    body: {
      type: 'category',
      enumeration: Object.entries(ORIGEN_VALORES).map(([label, value]) => ({ value, label }))
    }
  }
};

const salir = (mensaje) => {
  console.error(`✖ ${mensaje}`);
  process.exit(1);
};

const obtener = async (ruta) => {
  const r = await llamarBrevo('GET', ruta);
  if (!r.ok) salir(`GET ${ruta} falló (${r.status}): ${r.data?.message || r.error || ''}`);
  return r.data;
};

const crear = async (descripcion, metodo, ruta, body) => {
  if (!APLICAR) {
    console.log(`  · Falta ${descripcion} (se creará con --aplicar)`);
    return null;
  }
  const r = await llamarBrevo(metodo, ruta, body);
  if (!r.ok) salir(`No se pudo crear ${descripcion} (${r.status}): ${r.data?.message || r.error || ''}`);
  console.log(`  ✔ Creado ${descripcion}`);
  return r.data;
};

if (!brevoHabilitado()) salir('Falta BREVO_API_KEY en backend/.env');
if (!process.env.BREVO_API_KEY.startsWith('xkeysib-')) {
  salir('BREVO_API_KEY debe ser la API key (empieza por "xkeysib-"), no la clave MCP ni la SMTP.');
}

console.log(APLICAR ? 'Modo: APLICAR cambios\n' : 'Modo: solo revisión (usa --aplicar para crear lo que falte)\n');

// 1. Validar la clave
const cuenta = await obtener('/account');
console.log(`Cuenta Brevo: ${cuenta.email} · plan ${cuenta.plan?.map(p => p.type).join(', ') || '?'}`);
if (!cuenta.marketingAutomation?.enabled) {
  console.log('  ⚠ Marketing Automation está desactivado: actívalo en Brevo para usar el evento "pedido_creado".');
}

// 2. Atributos de contacto
console.log('\nAtributos:');
const { attributes = [] } = await obtener('/contacts/attributes');
for (const [nombre, { categoria, body }] of Object.entries(ATRIBUTOS)) {
  const existente = attributes.find(a => a.name === nombre);
  if (!existente) {
    await crear(`atributo ${nombre} (${body.type})`, 'POST', `/contacts/attributes/${categoria}/${nombre}`, body);
  } else if (nombre === 'ORIGEN') {
    const etiquetas = new Map((existente.enumeration || []).map(e => [e.label, e.value]));
    const correcto = existente.category === 'category' &&
      Object.entries(ORIGEN_VALORES).every(([label, value]) => etiquetas.get(label) === value);
    console.log(correcto
      ? '  ✔ ORIGEN (categoría: 1=registro, 2=newsletter, 3=checkout)'
      : '  ⚠ ORIGEN existe pero no es la categoría 1=registro, 2=newsletter, 3=checkout: revísalo en Brevo');
  } else {
    console.log(`  ✔ ${nombre}`);
  }
}
console.log(attributes.some(a => a.name === 'FIRSTNAME') ? '  ✔ FIRSTNAME (nombre del cliente)' : '  ⚠ Falta FIRSTNAME');

// 3. Listas (reutiliza las existentes; si hay duplicadas usa la más antigua)
console.log('\nListas:');
const { lists = [] } = await obtener('/contacts/lists?limit=50&sort=asc');
const ids = {};
let carpetaId = null;
for (const [clave, nombre] of Object.entries(LISTAS)) {
  const coincidencias = lists.filter(l => l.name === nombre).sort((a, b) => a.id - b.id);
  if (coincidencias.length > 0) {
    ids[clave] = coincidencias[0].id;
    carpetaId ??= coincidencias[0].folderId;
    console.log(`  ✔ Lista "${nombre}" (id ${coincidencias[0].id})`);
    if (coincidencias.length > 1) {
      console.log(`  ⚠ Hay ${coincidencias.length} listas "${nombre}" (ids ${coincidencias.map(l => l.id).join(', ')}): se usa la ${coincidencias[0].id}. Borra las demás en Brevo.`);
    }
  }
}
for (const [clave, nombre] of Object.entries(LISTAS)) {
  if (ids[clave]) continue;
  if (!carpetaId && APLICAR) {
    carpetaId = (await crear(`carpeta "${CARPETA_NUEVA}"`, 'POST', '/contacts/folders', { name: CARPETA_NUEVA }))?.id;
  }
  ids[clave] = (await crear(`lista "${nombre}"`, 'POST', '/contacts/lists', { name: nombre, folderId: carpetaId }))?.id;
}

// 4. Resultado
if (ids.clientes && ids.newsletter) {
  console.log('\nCopia esto en backend/.env:');
  console.log(`BREVO_LISTA_CLIENTES_ID=${ids.clientes}`);
  console.log(`BREVO_LISTA_NEWSLETTER_ID=${ids.newsletter}`);
} else if (!APLICAR) {
  console.log('\nEjecuta `pnpm brevo:setup --aplicar` para crear lo que falta.');
}
