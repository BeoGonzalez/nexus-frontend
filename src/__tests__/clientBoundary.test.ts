// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Guardas estáticas del código que se ejecuta en el navegador (OWASP A01/A02/A05).
 *
 * Código de servidor excluido: Route Handlers (src/app/api), BFF (src/infrastructure/bff),
 * Server Actions (src/application/actions), proxy y tests.
 */
const root = resolve(process.cwd());
const SERVER_ONLY = [/^src\/app\/api\//, /^src\/infrastructure\/bff\//, /^src\/application\/actions\//, /^src\/proxy\.ts$/];
const IGNORED = [/__tests__\//, /^src\/test\//, /\.test\.tsx?$/];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name)) yield full;
  }
}

const clientFiles = [...walk(join(root, 'src'))]
  .map((f) => ({ path: relative(root, f).replace(/\\/g, '/'), src: readFileSync(f, 'utf8') }))
  .filter(({ path }) => !SERVER_ONLY.some((r) => r.test(path)) && !IGNORED.some((r) => r.test(path)));

describe('el navegador solo habla con el BFF del propio origen (A01)', () => {
  it('hay archivos cliente que analizar', () => {
    expect(clientFiles.length).toBeGreaterThan(20);
  });

  it('todo fetch literal apunta a /api/** relativo', () => {
    const offenders: string[] = [];
    for (const { path, src } of clientFiles) {
      for (const m of src.matchAll(/\bfetch\(\s*([`'"])(.*?)\1/g)) {
        if (!m[2].startsWith('/api/')) offenders.push(`${path}: ${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('solo fetchClient usa fetch con una URL no literal (y valida que sea relativa)', () => {
    const offenders = clientFiles
      .filter(({ src }) => /\bfetch\(\s*[A-Za-z_$]/.test(src))
      .map(({ path }) => path);
    expect(offenders).toEqual(['src/infrastructure/api/fetchClient.ts']);
  });

  it.each([
    ['variables NEXT_PUBLIC_*_URL', /NEXT_PUBLIC_[A-Z0-9_]*URL/],
    ['puertos de microservicios 800x', /:800\d\b/],
    ['API Gateway (execute-api)', /execute-api/],
    ['URLs absolutas http(s) en fetch', /\bfetch\(\s*[`'"]https?:/],
  ])('ningún archivo cliente contiene %s', (_name, re) => {
    expect(clientFiles.filter(({ src }) => re.test(src)).map(({ path }) => path)).toEqual([]);
  });
});

describe('redirecciones seguras (A01 open redirect)', () => {
  it('todo archivo que lee un destino de la URL lo normaliza con safeRedirectPath', () => {
    const offenders = clientFiles
      .filter(({ src }) => /\.get\(\s*['"](redirect|next|returnTo|callbackUrl|redirect_uri)['"]\s*\)/.test(src))
      .filter(({ src }) => !/safeRedirectPath\(\s*searchParams\.get\(/.test(src))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('ninguna navegación usa directamente searchParams', () => {
    const offenders = clientFiles
      .filter(({ src }) =>
        /(router\.(push|replace)|location\.(assign|replace)|location\.href\s*=)\s*\(?\s*searchParams/.test(src)
      )
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
