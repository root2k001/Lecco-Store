FROM node:20-alpine AS base

# Dependencias del sistema necesarias para Prisma ORM y bcrypt en Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Habilitar pnpm estandarizado
RUN npm install -g pnpm@12.11.2

WORKDIR /app

# Copiar manifiestos de dependencias y schema de Prisma para aprovechar la caché de Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/

# Instalar dependencias respetando el lockfile
RUN pnpm install --frozen-lockfile

# Generar cliente de Prisma
RUN pnpm run build

# Copiar el resto del código fuente del backend
COPY . .

EXPOSE 3000

# ==========================================
# Etapa de Desarrollo (por defecto en compose)
# ==========================================
FROM base AS development
ENV NODE_ENV=development
# Aplica las migraciones pendientes antes de levantar el servidor
CMD ["sh", "-c", "pnpm db:migrate && pnpm dev"]

# ==========================================
# Etapa de Producción
# ==========================================
FROM base AS production
ENV NODE_ENV=production
CMD ["node", "server.js"]

