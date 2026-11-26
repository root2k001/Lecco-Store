import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { navegacion } from './test/navegacion.js';

// Router de Next simulado (ver src/test/navegacion.js)
vi.mock('next/navigation', async () => (await import('./test/navegacion.js')).moduloNavigation);
vi.mock('next/link', async () => (await import('./test/navegacion.js')).moduloLink);

afterEach(() => navegacion.reiniciar());
