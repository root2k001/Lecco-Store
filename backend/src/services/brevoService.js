/**
 * Integración con Brevo (marketing): contactos, listas, eventos y newsletter.
 *
 * Diseño: igual que emailService.js, NUNCA lanza errores. Si Brevo no está
 * configurado o falla, solo se registra un aviso; el registro, las compras y el
 * perfil siguen funcionando. Los llamadores pueden invocarlo sin `await`.
 *
 * Variables de entorno (backend):
 *   BREVO_API_KEY              Clave de API (xkeysib-...). Sin ella, todo es no-op.
 *   BREVO_LISTA_CLIENTES_ID    ID de la lista "Clientes"   (ver `pnpm brevo:setup`)
 *   BREVO_LISTA_NEWSLETTER_ID  ID de la lista "Newsletter" (ver `pnpm brevo:setup`)
 *   BREVO_DOI_TEMPLATE_ID      Plantilla de doble opt-in creada en el panel de Brevo
 *   BREVO_DOI_REDIRECT_URL     A dónde vuelve el usuario tras confirmar la suscripción
 */
const BREVO_API = 'https://api.brevo.com/v3';
const TIMEOUT_MS = 5000;

export const brevoHabilitado = () => Boolean(process.env.BREVO_API_KEY);

const idDeEnv = (nombre) => {
  const id = Number(process.env[nombre]);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const listaClientesId = () => idDeEnv('BREVO_LISTA_CLIENTES_ID');
export const listaNewsletterId = () => idDeEnv('BREVO_LISTA_NEWSLETTER_ID');

/**
 * Llamada HTTP a Brevo. Devuelve { ok, status, data } y nunca lanza.
 */
export const llamarBrevo = async (metodo, ruta, body) => {
  if (!brevoHabilitado()) {
    return { ok: false, status: 0, data: null, omitido: true };
  }
  try {
    const res = await fetch(`${BREVO_API}${ruta}`, {
      method: metodo,
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const texto = await res.text();
    let data = null;
    try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
    if (!res.ok) {
      console.warn(`[Brevo] ${metodo} ${ruta} → ${res.status}`, data?.message || data?.code || '');
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`[Brevo] ${metodo} ${ruta} falló:`, err.message);
    return { ok: false, status: 0, data: null, error: err.message };
  }
};

// Brevo espera fechas de atributos tipo "date" como YYYY-MM-DD
const fechaBrevo = (fecha) => (fecha ? new Date(fecha).toISOString().slice(0, 10) : undefined);

// ORIGEN es un atributo de tipo "categoría" en Brevo: se envía el número de la opción
export const ORIGEN_VALORES = { registro: 1, newsletter: 2, checkout: 3 };

// Quita valores undefined para no enviar atributos vacíos
const limpiar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Crea o actualiza un contacto.
 * - Siempre lo añade a la lista Clientes.
 * - enNewsletter=true lo añade a Newsletter; enNewsletter=false lo quita de Newsletter;
 *   undefined no toca la suscripción.
 */
export const sincronizarContacto = async ({ email, nombre, origen, enNewsletter, estadisticas } = {}) => {
  if (!brevoHabilitado() || !email) return { ok: false, omitido: true };

  const clientes = listaClientesId();
  const newsletter = listaNewsletterId();
  const listIds = [clientes, enNewsletter === true ? newsletter : null].filter(Boolean);

  const attributes = limpiar({
    FIRSTNAME: nombre, // atributo estándar de Brevo ({{ contact.FIRSTNAME }} en plantillas)
    ORIGEN: origen ? ORIGEN_VALORES[origen] : undefined,
    NUM_PEDIDOS: estadisticas?.numPedidos,
    TOTAL_GASTADO: estadisticas?.totalGastado,
    ULTIMA_COMPRA: fechaBrevo(estadisticas?.ultimaCompra)
  });

  const resultado = await llamarBrevo('POST', '/contacts', {
    email,
    attributes,
    ...(listIds.length ? { listIds } : {}),
    updateEnabled: true
  });

  // Retirada del consentimiento: sacarlo de la lista Newsletter
  if (enNewsletter === false && newsletter) {
    await llamarBrevo('PUT', `/contacts/${encodeURIComponent(email)}`, { unlinkListIds: [newsletter] });
  }

  return resultado;
};

/**
 * Suscripción a la newsletter con doble opt-in: Brevo envía un correo de
 * confirmación y solo añade el contacto a la lista cuando el usuario confirma.
 */
export const suscribirNewsletter = async ({ email, nombre }) => {
  const newsletter = listaNewsletterId();
  const templateId = idDeEnv('BREVO_DOI_TEMPLATE_ID');
  const redirectionUrl = process.env.BREVO_DOI_REDIRECT_URL;

  if (!brevoHabilitado() || !newsletter || !templateId || !redirectionUrl) {
    return { ok: false, configurado: false };
  }

  const resultado = await llamarBrevo('POST', '/contacts/doubleOptinConfirmation', {
    email,
    includeListIds: [newsletter],
    templateId,
    redirectionUrl,
    attributes: limpiar({ FIRSTNAME: nombre, ORIGEN: ORIGEN_VALORES.newsletter })
  });
  return { ...resultado, configurado: true };
};

/**
 * Evento personalizado para automatizaciones (ej. "pedido_creado").
 * Nota: Brevo reserva cart_updated / order_completed para su app de ecommerce.
 */
export const registrarEvento = async (email, nombreEvento, propiedades = {}) => {
  if (!brevoHabilitado() || !email) return { ok: false, omitido: true };
  return llamarBrevo('POST', '/events', {
    event_name: nombreEvento,
    identifiers: { email_id: email },
    event_properties: propiedades
  });
};
