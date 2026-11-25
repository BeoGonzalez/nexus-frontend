import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/infrastructure/bff/sessionCookie';
import { clientIp, rateLimit } from '@/infrastructure/bff/rateLimit';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/infrastructure/bff/requestId';
import { faroConfig } from '@/infrastructure/observability/faro';

/**
 * Proxy (antes "middleware") de Next.js 16 — primera línea de defensa, NUNCA la única:
 * la autorización real se repite en el DAL (src/infrastructure/bff/session.ts) dentro de cada
 * Route Handler, Server Action y layout protegido.
 *
 * - OWASP A02/A05: Content-Security-Policy estricta con nonce por petición.
 * - OWASP A01/A06: verificación de Origin en métodos que mutan (/api) → mitiga CSRF.
 * - OWASP A06/A07: rate limiting en login/registro/recuperación, correo y asistente IA.
 * - OWASP A01: filtro optimista de /admin sin cookie de sesión (el control real está en el layout).
 */

const isDev = process.env.NODE_ENV === 'development';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Orígenes adicionales permitidos para peticiones que mutan (coma-separados, p. ej. dominio canónico). */
const EXTRA_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

const RATE_RULES: Array<{ test: RegExp; limit: number; windowMs: number; name: string }> = [
  { name: 'login', test: /^\/api\/v1\/auth\/login$/, limit: 10, windowMs: 5 * 60_000 },
  {
    name: 'auth-sensitive',
    test: /^\/api\/v1\/auth\/(register|confirm|resend-code|forgot-password|reset-password)$/,
    limit: 5,
    windowMs: 15 * 60_000,
  },
  { name: 'refresh', test: /^\/api\/v1\/auth\/refresh$/, limit: 30, windowMs: 15 * 60_000 },
  { name: 'receipt', test: /^\/api\/v1\/notifications\/send-receipt$/, limit: 10, windowMs: 10 * 60_000 },
  { name: 'assistant', test: /^\/api\/(v1\/assistant\/|assistant\/chat$)/, limit: 30, windowMs: 60_000 },
  { name: 'payment-methods', test: /^\/api\/(v1\/)?orders\/payment-methods$/, limit: 10, windowMs: 10 * 60_000 },
  { name: 'api-write', test: /^\/api\//, limit: 120, windowMs: 60_000 },
];

/**
 * CSP estricta. `dev` añade `'unsafe-eval'` SOLO en desarrollo (React lo usa para reconstruir stacks);
 * en producción nunca (Next/React no usan eval). `img-src https:` es una excepción documentada: las
 * portadas del catálogo las define el admin en cualquier host HTTPS y no hay un CDN propio al que
 * restringirlas (Learner Lab sin CloudFront); el riesgo residual es solo un píxel de seguimiento.
 */
export function buildCsp(nonce: string, dev: boolean = isDev): string {
  const region = (process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1').replace(/[^a-z0-9-]/g, '');
  const connect = [
    "'self'",
    `https://cognito-idp.${region}.amazonaws.com`,
    `https://cognito-identity.${region}.amazonaws.com`,
    'https://*.amazoncognito.com',
    // Grafana Faro (observabilidad del navegador): solo el origen exacto del colector, si está configurado.
    ...(faroConfig() ? [faroConfig()!.origin] : []),
    ...(dev ? ['ws:', 'wss:'] : []),
  ];
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Estilos inline requeridos por React (atributos style), next/font y three.js; sin ejecución de código.
    "style-src 'self' 'unsafe-inline'",
    // Portadas del catálogo: cualquier host HTTPS (las define el admin); nunca http:.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ];
  return directives.join('; ');
}

function forbidden(requestId: string, detail: string, status = 403, extra: Record<string, string> = {}) {
  return NextResponse.json(
    { detail },
    { status, headers: { 'Cache-Control': 'no-store', [REQUEST_ID_HEADER]: requestId, ...extra } }
  );
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    if (EXTRA_ORIGINS.has(origin)) return true;
    // Origen canónico (SITE_URL, definido en el despliegue) y el Host real de la petición.
    // NUNCA X-Forwarded-Host: lo puede enviar el cliente y el ALB conserva el Host original.
    const site = process.env.SITE_URL;
    try {
      const o = new URL(origin);
      if (site && o.origin === new URL(site).origin) return true;
      return o.host === request.headers.get('host');
    } catch {
      return false;
    }
  }
  // Sin Origin: los navegadores modernos envían Sec-Fetch-Site; clientes no-navegador no portan
  // cookies ambientales de la víctima (no aplica CSRF).
  const site = request.headers.get('sec-fetch-site');
  return !site || site === 'same-origin' || site === 'none';
}

function logBlocked(event: string, request: NextRequest, requestId: string, extra: Record<string, unknown> = {}) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'warn',
      event,
      method: request.method,
      path: request.nextUrl.pathname.slice(0, 200),
      request_id: requestId,
      ...extra,
    })
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // A09: un único X-Request-ID por petición, compartido por el BFF, el backend y el navegador.
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  // ---------------------------------------------------------------- API (BFF)
  if (pathname.startsWith('/api/')) {
    if (MUTATING.has(request.method)) {
      if (!isAllowedOrigin(request)) {
        logBlocked('csrf.origin_rejected', request, requestId);
        return forbidden(requestId, 'Operación no permitida.');
      }
      const ip = clientIp(request.headers);
      const rule = RATE_RULES.find((r) => r.test.test(pathname));
      if (rule) {
        const result = rateLimit(`${rule.name}:${ip}`, rule.limit, rule.windowMs);
        if (!result.allowed) {
          logBlocked('ratelimit.exceeded', request, requestId, { rule: rule.name });
          return forbidden(requestId, 'Demasiados intentos. Inténtalo más tarde.', 429, {
            'Retry-After': String(result.retryAfterSeconds),
          });
        }
      }
    }
    const apiResponse = NextResponse.next({ request: { headers: requestHeaders } });
    apiResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return apiResponse;
  }

  // ---------------------------------------------------------------- Páginas
  if (pathname.startsWith('/admin') && !request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirect=${encodeURIComponent('/admin')}`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set(REQUEST_ID_HEADER, requestId);
    return redirect;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
