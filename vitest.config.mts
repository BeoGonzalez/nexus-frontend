import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Las pruebas de integración necesitan microservicios vivos: `pnpm test:integration`.
    exclude: ['**/node_modules/**', '**/.next/**', 'src/test/*-integration.test.ts'],
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // `server-only` lanza fuera de Next.js; en pruebas se sustituye por un módulo vacío.
      'server-only': path.resolve(import.meta.dirname, './src/test/stubs/server-only.ts'),
    },
  },
});
