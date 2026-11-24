import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Pruebas contra microservicios vivos (docker compose / entorno de lab): `pnpm test:integration`.
 * Configuración independiente a propósito: mergeConfig concatenaría el `exclude` de la base.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/test/*-integration.test.ts'],
    setupFiles: ['./src/test/setup.ts', './src/test/integration-setup.ts'],
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'server-only': path.resolve(import.meta.dirname, './src/test/stubs/server-only.ts'),
    },
  },
});
