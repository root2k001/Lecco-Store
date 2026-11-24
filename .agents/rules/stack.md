---
trigger: model_decision

description: Arquitectura y versiones del stack de Lecco-Store. Leer antes de instalar paquetes, crear rutas o modificar Prisma.
---
## 1. Frontend (Cliente)

El cliente está desarrollado como una *Single Page Application* (SPA) con una arquitectura basada en componentes y gestión de estado modular.

* **Core & UI:**
  * **React (`^19.2.0`)** y **React DOM (`^19.2.0`)**: Biblioteca principal para la construcción de la interfaz de usuario.
  * **CSS Modules / CSS Vanilla**: Estilizado encapsulado por componente (`.module.css` y `.css`).
* **Enrutamiento y Estado:**
  * **React Router DOM (`^7.13.1`)**: Navegación del lado del cliente y protección de rutas administrativas (`RutaAdmin`).
  * **TanStack React Query (`^5.103.1`)**: Gestión de caché y peticiones asíncronas.
  * **React Context API**: Estado global dividido por dominio (`AuthContext`, `CarritoContext`, `FavoritosContext`, `ToastContext`).
* **Bundler y Herramientas de Desarrollo:**
  * **Vite (`^7.3.1`)** + **`@vitejs/plugin-react` (`^5.1.1`)**: Servidor de desarrollo ultrarrápido y empaquetador para producción (incluye configuración de proxy para `/api`).
  * **ESLint (`^9.39.1`)**: Análisis estático y linting del código.
* **Testing:**
  * **Vitest (`^5.0.3`)**: Framework de pruebas unitarias.
  * **Testing Library (`@testing-library/react`, `jest-dom`, `user-event`)** + **Happy DOM (`^20.14.5`)**: Simulación del DOM y pruebas de componentes.



## 2. Backend (Servidor y API REST)

El servidor está construido en Node.js siguiendo una arquitectura RESTful modular y desacoplada.

* **Entorno y Framework:**
  * **Node.js** (con soporte nativo de **ES Modules**, `"type": "module"`).
  * **Express (`^4.19.2`)**: Framework principal para la definición de rutas y middlewares de la API REST.
* **ORM y Base de Datos:**
  * **PostgreSQL** (alojado en **Neon DB**): Base de datos relacional en la nube con soporte para tipos nativos como arreglos (`text[]`) y decimales de precisión (`numeric`).
  * **Prisma ORM (`^5.14.0` / `5.22.0`)** y **`@prisma/client`**: Modelado de datos (`schema.prisma`), migraciones versionadas y consultas tipadas.
* **Seguridad y Validación:**
  * **Zod (`^4.6.5`)**: Validación estricta de esquemas de entrada en los endpoints (`crearProductoSchema`, `actualizarProductoSchema`, etc.).
  * **JSON Web Token (`jsonwebtoken` `^9.0.3`)** + **Cookie Parser (`^1.4.7`)**: Autenticación y manejo de sesiones mediante tokens JWT y cookies HTTP.
  * **Bcrypt (`^6.0.0`)**: Encriptación (hashing) de contraseñas.
  * **Helmet (`^8.3.0`)**: Protección de cabeceras HTTP.
  * **CORS (`^2.8.5`)**: Control de acceso entre orígenes (Frontend/Backend).
  * **Express Rate Limit (`^8.7.0`)**: Protección contra fuerza bruta y spam en rutas públicas (como el formulario de contacto).
* **Servicios Externos y Multimedia:**
  * **Cloudinary (`^2.10.0`)** + **Multer (`^2.2.0`)**: Procesamiento y almacenamiento en la nube de imágenes y videos de productos.
  * **Resend (`^6.14.0`)**: Envío de correos electrónicos transaccionales vía API HTTP.
  * **Dotenv (`^16.4.5`)**: Gestión de variables de entorno.



## 3. Gestión de Paquetes, Control de Versiones y Despliegue

* **Gestor de Paquetes:**
  * **pnpm (`v12.11.2`)**: Estandarizado tanto en la raíz (Frontend) como en `/backend` mediante `pnpm-lock.yaml` y `pnpm-workspace.yaml`.
* **Control de Versiones:**
  * **Git / GitHub**: Flujo de trabajo basado en ramas (`rama`).
* **Infraestructura y Despliegue (Cloud):**
  * **Vercel**: Alojamiento del Frontend (configurado mediante `vercel.json` para reescrituras SPA y proxy de API).
  * **Render**: Alojamiento del servidor Backend en Node.js.
  * **Neon**: Base de datos PostgreSQL Serverless con soporte para *branching* y recuperación *Point-in-Time*.