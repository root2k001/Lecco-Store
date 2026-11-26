import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next', 'out', 'next-env.d.ts', 'backend/**']),
  {
    // .mjs/.cjs incluidos: next.config.mjs y scripts también se analizan
    files: ['**/*.{js,jsx,mjs,cjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      // Permite los exports especiales de Next (metadata, revalidate, generateMetadata...)
      reactRefresh.configs.next,
      // Reglas oficiales de Next.js (Core Web Vitals / SEO)
      nextPlugin.configs['core-web-vitals'],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // Next ejecuta los componentes también en Node (SSR, next.config)
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      next: { rootDir: '.' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // <Image> y next/font cambian el HTML/tipografía (y con ello el diseño). Las imágenes ya
      // llegan optimizadas desde Cloudinary y la fuente se carga en el layout raíz (todas las páginas).
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',
      // Los contexts exportan su hook junto al Provider (useAuth, useCarrito...): patrón estándar
      'react-refresh/only-export-components': ['error', {
        allowExportNames: [
          'metadata', 'generateMetadata', 'viewport', 'generateViewport', 'revalidate',
          'dynamic', 'generateStaticParams',
          'useAuth', 'useCarrito', 'useFavoritos', 'useToast', 'CarritoContext',
        ],
      }],
    },
  },
])
