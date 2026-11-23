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
# Etapa de Desarrollo (Vite HMR en caliente)
# ==========================================
FROM base AS development
ENV NODE_ENV=development
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ==========================================
# Etapa de Compilación para Producción
# ==========================================
FROM base AS build
ARG VITE_WHATSAPP_NUMERO=51966894989
ENV VITE_WHATSAPP_NUMERO=$VITE_WHATSAPP_NUMERO
RUN pnpm run build

# ==========================================
# Etapa de Producción Servida con Nginx
# ==========================================
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

