// Arranque del servidor standalone de Next.js en una imagen distroless con FS de solo lectura.
// `.next/cache` es un symlink a /tmp/next-cache (montado como tmpfs): se crea antes de arrancar.
import { mkdirSync } from 'node:fs';

for (const dir of ['/tmp/next-cache/images', '/tmp/next-cache/fetch-cache']) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

await import('./server.js');
