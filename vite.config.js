import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.BACKEND_URL || env.VITE_BACKEND_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      host: true, // Escucha en 0.0.0.0 para acceso desde Docker y red local
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
