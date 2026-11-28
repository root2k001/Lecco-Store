import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setupTests.js'],
    // Los tests del backend usan node:test y se ejecutan con `pnpm test` dentro de /backend
    exclude: [...configDefaults.exclude, 'backend/**'],
  },
});
