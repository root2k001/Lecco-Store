FROM node:20-alpine AS base

# Habilitar pnpm estandarizado
RUN npm install -g pnpm@12.11.2

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

# Instalar dependencias respetando el lockfile
RUN pnpm install --frozen-lockfile

# Copiar código fuente del frontend
COPY . .

# ==========================================
# Etapa de Desarrollo (Next.js con recarga en caliente)
# ==========================================
FROM base AS development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 5173
CMD ["pnpm", "exec", "next", "dev", "-H", "0.0.0.0", "-p", "5173"]

# ==========================================
# Etapa de Compilación para Producción
# ==========================================
FROM base AS build
# Las variables NEXT_PUBLIC_* se incrustan en el build
ARG NEXT_PUBLIC_WHATSAPP_NUMERO=51966894989
ARG NEXT_PUBLIC_SITE_URL=http://localhost:5173
# Backend para el proxy /api y la precarga SSR (en Compose: http://backend:3000)
ARG BACKEND_URL=http://backend:3000
ENV NEXT_PUBLIC_WHATSAPP_NUMERO=$NEXT_PUBLIC_WHATSAPP_NUMERO \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    BACKEND_URL=$BACKEND_URL \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ==========================================
# Etapa de Producción: servidor Node de Next (standalone)
# ==========================================
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=5173
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 5173
CMD ["node", "server.js"]
