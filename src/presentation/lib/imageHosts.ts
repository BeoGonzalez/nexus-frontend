/**
 * Hosts EXACTOS cuyas imágenes puede descargar y transformar el optimizador de Next (`/_next/image`).
 *
 * OWASP A10:2021 (SSRF) / A06 (abuso de recursos): nunca comodines como `*.s3.amazonaws.com`, que
 * convertirían el servidor en proxy del ancho de banda y la CPU de cualquier bucket de AWS y permitirían
 * servir imágenes ajenas (phishing) bajo el dominio de la tienda.
 *
 * `NEXT_PUBLIC_IMAGE_HOSTS`: lista separada por comas de hostnames exactos (p. ej. el bucket de assets
 * `nexus-lab-assets-123.s3.us-east-1.amazonaws.com`). No es un secreto: el navegador la necesita para decidir
 * qué portadas pasan por el optimizador. Se fija en el BUILD (next.config la usa para `remotePatterns`).
 * Cualquier otro host se renderiza `unoptimized` (el navegador lo pide directo, acotado por la CSP).
 */

const DEFAULT_HOSTS = ['images.unsplash.com'] as const;
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function optimizableHosts(raw: string | undefined = process.env.NEXT_PUBLIC_IMAGE_HOSTS): string[] {
  const extra = (raw ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => HOSTNAME_RE.test(h));
  return Array.from(new Set<string>([...DEFAULT_HOSTS, ...extra]));
}
