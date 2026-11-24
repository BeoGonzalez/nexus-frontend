/**
 * Correlación de peticiones (OWASP A09).
 *
 * `src/proxy.ts` fija un `X-Request-ID` por petición (reutiliza el entrante solo si es seguro) y el
 * BFF lo propaga a los microservicios, a `securityLog` y al navegador. El mismo valor permite unir
 * los logs del BFF, del backend (que lo devuelve como `request_id`) y el reporte de un usuario.
 *
 * Isomórfico a propósito: lo usa el proxy (runtime de Next) y los Route Handlers.
 */

export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_RE.test(value);
}

/** Devuelve el id entrante si es válido; si no, uno nuevo (nunca se refleja un valor inseguro). */
export function resolveRequestId(incoming: string | null | undefined): string {
  return isValidRequestId(incoming) ? incoming : crypto.randomUUID();
}

/** Id de la petición en un Route Handler (re-valida por si el matcher del proxy no la cubrió). */
export function requestIdFrom(request: { headers: { get(name: string): string | null } }): string {
  return resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
}
