/**
 * Setup SOLO para las pruebas de integración contra microservicios vivos (`pnpm test:integration`).
 *
 * `fetchClient` del navegador solo usa rutas relativas `/api/**` (OWASP A01). Aquí, fuera del
 * bundle cliente, se reescriben esas rutas hacia cada microservicio para poder probarlos.
 */
const SERVICES: Array<[prefix: string, envs: string[], fallback: string]> = [
  ['/api/v1/orders', ['ORDERS_SERVICE_URL', 'NEXT_PUBLIC_ORDERS_API_URL'], 'http://localhost:8004'],
  ['/api/v1/cart', ['CART_SERVICE_URL', 'NEXT_PUBLIC_CART_API_URL'], 'http://localhost:8003'],
  ['/api/v1/catalog', ['CATALOG_SERVICE_URL', 'NEXT_PUBLIC_CATALOG_API_URL'], 'http://localhost:8002'],
  ['/api/v1/assistant', ['ASSISTANT_SERVICE_URL', 'NEXT_PUBLIC_ASSISTANT_API_URL'], 'http://localhost:8007'],
  ['/api/v1/recommendations', ['RECOMMENDATIONS_SERVICE_URL', 'NEXT_PUBLIC_RECOMMENDATIONS_API_URL'], 'http://localhost:8006'],
  ['/api/v1/notifications', ['NOTIFICATIONS_SERVICE_URL', 'NEXT_PUBLIC_NOTIFICATIONS_API_URL'], 'http://localhost:8005'],
  ['/api/v1/auth', ['AUTH_SERVICE_URL', 'NEXT_PUBLIC_AUTH_API_URL'], 'http://localhost:8001'],
];

const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    const hit = SERVICES.find(([prefix]) => input.startsWith(prefix));
    if (hit) {
      const base = hit[1].map((name) => process.env[name]).find(Boolean) || hit[2];
      return realFetch(`${base}${input}`, init);
    }
  }
  return realFetch(input, init);
}) as typeof fetch;
