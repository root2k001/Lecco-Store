# Plan de implementación: Brevo en Lecco Store

> Fecha: 24/11/2026 · Estado: propuesta (sin implementar)

## Qué aportaría Brevo

Hoy Lecco Store usa **Resend** solo para correos automáticos de un único cliente: la bienvenida y el cambio de estado del pedido. Brevo añade lo que falta para hacer **marketing**:

| Necesidad | Hoy | Con Brevo |
|---|---|---|
| Base de clientes para marketing | No existe | Contactos con datos (compras, gasto, última compra) y listas |
| Envíos masivos (campañas) | No existe | Editor de correos, programación, pruebas A/B, informes de aperturas y clics |
| Automatizaciones | No existe | Bienvenida en varios correos, carrito abandonado, post-compra, reactivación |
| Segmentación | No existe | Por ejemplo: "compró gafas de sol el verano pasado" o "gastó más de S/ 300" |
| Otros canales | Pedidos por WhatsApp a mano | Campañas por SMS y WhatsApp desde la misma herramienta |
| Baja de suscripciones y consentimiento | No existe | Enlace de baja, confirmación por correo (doble opt-in) e historial gestionados por Brevo |

**Recomendación:** mantener Resend para los correos automáticos que ya funcionan y usar Brevo **solo para marketing** en una primera fase. Unificar todo en Brevo más adelante es opcional.

---

## Fase 0: Requisitos previos (1 día)

1. Crear la cuenta en Brevo y **verificar tu dominio** con SPF, DKIM y DMARC. Sin esto, las campañas acaban en spam.
2. Crear una API key y guardarla **solo en el backend**, como `BREVO_API_KEY` en Render y en `backend/.env`. Nunca en una variable `VITE_`, porque esas acaban en el navegador.
3. En Brevo, crear:
   - **Listas:** `Clientes`, `Newsletter`.
   - **Atributos del contacto:** `NOMBRE`, `NUM_PEDIDOS`, `TOTAL_GASTADO`, `ULTIMA_COMPRA`, `ORIGEN` (registro, newsletter o checkout).
4. **Aspecto legal (Perú, Ley 29733 de datos personales):** para enviar marketing necesitas el **consentimiento expreso** del cliente. Hoy el registro no lo pide, así que es obligatorio añadirlo antes de la primera campaña.

## Fase 1: Backend y sincronización de contactos (2-3 días)

**Esquema (`schema.prisma`)**, con una migración nueva:

```prisma
model Usuario {
  // ...
  aceptaMarketing   Boolean   @default(false)
  consentimientoEn  DateTime?
}
```

**Nuevo `backend/src/services/brevoService.js`**, con el mismo diseño que `emailService.js`: si no hay API key no hace nada y **nunca lanza errores**, para que un fallo de Brevo jamás bloquee un registro o una compra.

- `sincronizarContacto({ email, nombre, listas, atributos })`: llama a `POST /v3/contacts` con `updateEnabled: true`, así crea el contacto o lo actualiza si ya existe.
- `registrarEvento(email, evento, datos)`: envía eventos como `pedido_creado` que disparan automatizaciones. El endpoint exacto de eventos conviene confirmarlo en la documentación de Brevo antes de programarlo.

**Puntos donde se conecta:**

| Dónde | Qué se envía a Brevo |
|---|---|
| `POST /api/usuarios/registro` | Contacto en la lista `Clientes`; en `Newsletter` solo si `aceptaMarketing` |
| `POST /api/pedidos` | Actualiza `NUM_PEDIDOS`, `TOTAL_GASTADO` y `ULTIMA_COMPRA`, y envía el evento `pedido_creado` |
| `PUT /api/usuarios/perfil` | Sincroniza el cambio de consentimiento |
| **Nuevo** `POST /api/newsletter` | Suscripción de invitados con **doble opt-in**, límite de peticiones y validación con Zod |
| **Nuevo** `POST /api/webhooks/brevo` | Cuando alguien se da de baja en Brevo, pone `aceptaMarketing = false` en tu base de datos (con verificación de firma o token) |

## Fase 2: Frontend (1-2 días)

- Casilla de consentimiento, **sin marcar por defecto**, en el registro (`AuthContext` y su modal) y en el checkout de invitados (`Carrito.jsx`).
- Formulario de newsletter en el pie de página (`Footer.jsx`), que también puede usar el hueco que dejó "Contacto".
- Una opción en el perfil para activar o desactivar los correos de ofertas.

## Fase 3: Pestaña de campañas en la tienda (3-4 días)

Aquí es donde Brevo encaja con una "Colección de verano". Hoy las agrupaciones son interruptores de sí/no (`sale`, `coleccion`, `nuevosingresos`), y por cada campaña nueva habría que añadir una columna, una migración y una página. Propuesta de modelo reutilizable:

```prisma
model Campana {
  id          Int       @id @default(autoincrement())
  slug        String    @unique        // "verano-2027"
  titulo      String                   // "Colección de Verano"
  descripcion String?
  banner      String?                  // imagen subida a Cloudinary
  inicio      DateTime
  fin         DateTime
  activa      Boolean   @default(true)
  productos   Producto[]               // relación muchos a muchos
}
```

- **Backend:**
  - `GET /api/campanas/activas` (pública, filtra por fechas);
  - `GET /api/productos?campana=verano-2027` (otro filtro, igual que `?sale=true`);
  - CRUD de campañas para el admin.
- **Frontend:**
  - ruta `/campanas/:slug`, que reutiliza `Productos.jsx` con un filtro, igual que `/Sale`;
  - pestaña "Campañas" en la cabecera que **solo aparece si hay alguna activa**;
  - carrusel en la página de inicio.
- **Admin:** pestaña para crear campañas, subir el banner y asignar productos.
- **Atribución de ventas:** los correos de Brevo llevan enlaces con UTM (`?utm_source=brevo&utm_campaign=verano-2027`). El frontend guarda el UTM en `sessionStorage` y lo manda al crear el pedido, y se guarda en un campo nuevo `Pedido.origenCampana`. Así `/api/stats` puede responder **cuánto vendió cada campaña**.

## Fase 4: Automatizaciones en Brevo (1-2 días, casi todo en el panel de Brevo)

| Automatización | Se activa con | Valor |
|---|---|---|
| Bienvenida (2-3 correos) | Alta en `Newsletter` | Presentar la marca y dar un cupón para la primera compra |
| Post-compra | Evento `pedido_creado` | Cuidados de las gafas, pedir reseña, venta cruzada |
| Carrito abandonado | Evento de carrito sin pedido en 24 h | Recuperar ventas (necesita guardar el carrito de los usuarios con sesión en el servidor; hoy solo está en el navegador) |
| Reactivación | `ULTIMA_COMPRA` hace más de 90 días | Volver a atraer al cliente |
| Lanzamiento de campaña | Nueva `Campana` activa | Aviso automático a los suscriptores |

## Fase 5: Tests (1 día)

- Ampliar `backend/test/flujo-negocio.test.js` con Brevo simulado:
  - el registro y la compra **funcionan aunque Brevo esté caído**;
  - solo se suscribe a quien dio su consentimiento;
  - el webhook de baja actualiza la base de datos.
- Tests del filtro `?campana=` y de que la pestaña solo aparece con campañas activas.

---

## Ejemplo: "Colección de Verano 2027"

| Cuándo | En la tienda | En Brevo |
|---|---|---|
| 30 días antes | Crear la campaña en el admin, asignar productos, subir el banner | Crear el segmento "compró en verano anterior" y el segmento de suscriptores activos |
| 7 días antes | Campaña creada pero inactiva | Correo de adelanto con prueba A/B de asuntos |
| Lanzamiento | Se activa: aparecen la pestaña, el carrusel y `/campanas/verano-2027` | Correo y WhatsApp con enlaces UTM |
| A mitad | Ajustar stock o productos según ventas | Recordatorio solo a quien abrió y no compró |
| 48 h antes del cierre | El aviso de fecha de cierre se muestra solo | Correo de "última oportunidad" |
| Después | `/api/stats` muestra las ventas atribuidas a la campaña | Informe de aperturas, clics y conversiones |

## Esfuerzo y riesgos

- **Total estimado:** de 9 a 13 días de desarrollo. Las fases 0 a 2 ya permiten captar suscriptores, y conviene empezar por ahí cuanto antes, porque la lista tarda en crecer.
- **Coste:** Brevo tiene un plan gratuito, limitado a unos 300 correos al día cuando se revisó; los planes de pago se cobran por volumen de envíos. Revisa los precios actuales antes de decidir.
- **Riesgos:**
  - Sin dominio verificado, los correos van a spam.
  - Sin consentimiento hay riesgo legal.
  - Si Brevo se llama de forma que bloquee la petición, una caída suya rompería las compras; el diseño "no lanza errores" lo evita.
