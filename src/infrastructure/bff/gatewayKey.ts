/**
 * API key de API Gateway (OWASP A01 / A06).
 *
 * API Gateway (`nexus-lab-api`) es público. Si sus métodos exigen API key (`apiKeyRequired`), solo el
 * BFF —que conoce la clave— puede llamar a los microservicios, y nadie puede saltarse los controles
 * del BFF (lista blanca, Zod, rate limit, anti-enumeración) llamando directamente a execute-api.
 *
 * La clave se lee de `API_GATEWAY_KEY` SOLO en el servidor (sin prefijo NEXT_PUBLIC_, nunca llega
 * al bundle del navegador). Si no está definida, no se añade nada (desarrollo local).
 */
export function withGatewayKey(headers: Headers): Headers {
  const key = typeof window === 'undefined' ? process.env.API_GATEWAY_KEY : undefined;
  if (key) headers.set('x-api-key', key);
  return headers;
}
