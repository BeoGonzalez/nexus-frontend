#!/usr/bin/env node
/**
 * OWASP A02/A04 — Comprueba que ningún secreto del servidor acabó en el bundle del navegador.
 *
 * Uso (tras `next build` con valores canario en las variables secretas):
 *   API_GATEWAY_KEY=canary-gw-xxxx pnpm build && node scripts/assert-no-secrets-in-bundle.mjs
 *
 * Busca el VALOR de cada variable listada en SECRET_ENV_VARS dentro de `.next/static` (lo único que
 * se sirve al navegador). Sale con código 1 si aparece alguno.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SECRET_ENV_VARS = ['API_GATEWAY_KEY'];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Devuelve los archivos de `dir` que contienen alguno de `secrets`. */
export function findSecretsInBundle(dir, secrets) {
  for (const s of secrets) {
    if (typeof s !== 'string' || s.length < 8) throw new Error('Cada secreto a buscar debe tener al menos 8 caracteres');
  }
  const hits = [];
  for (const file of walk(dir)) {
    const content = readFileSync(file, 'latin1');
    if (secrets.some((s) => content.includes(s))) hits.push(file);
  }
  return hits;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const staticDir = resolve(process.argv[2] || '.next/static');
  const secrets = SECRET_ENV_VARS.map((name) => process.env[name]).filter(Boolean);
  if (secrets.length !== SECRET_ENV_VARS.length) {
    console.error(`Define valores canario para: ${SECRET_ENV_VARS.join(', ')} antes de construir y comprobar.`);
    process.exit(2);
  }
  const hits = findSecretsInBundle(staticDir, secrets);
  if (hits.length) {
    console.error(`SECRETO EXPUESTO en el bundle del navegador:\n${hits.join('\n')}`);
    process.exit(1);
  }
  console.log(`OK: ningún secreto (${SECRET_ENV_VARS.join(', ')}) aparece en ${staticDir}`);
}
