import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { buildForwardHeaders } from './forwardHeaders';
import { securityLog } from './securityLog';
import { REQUEST_ID_HEADER, requestIdFrom } from './requestId';

/**
 * Proxy endurecido del BFF hacia los microservicios FastAPI.
 *
 * OWASP A01 (SSRF / path traversal): el destino SIEMPRE es un servicio de la lista blanca
 *   (variables *_SERVICE_URL del servidor). Cada segmento de ruta proveniente del cliente se valida
 *   (sin `.`/`..`, sin `/`, `\`, `%` ni caracteres de control) y se comprueba que la URL final siga
 *   en el mismo origen y bajo el prefijo esperado. No se siguen redirecciones.
 * OWASP A05: cuerpos JSON con límite de tamaño y parseo seguro.
 * OWASP A10: los errores 5xx y de red se devuelven con mensajes genéricos; nunca `error.message`.
 */

export type ServiceName =
  | 'auth'
  | 'catalog'
  | 'cart'
  | 'orders'
  | 'notifications'
  | 'recommendations'
  | 'assistant';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const SERVICE_ENV: Record<ServiceName, { env: string; fallback: string }> = {
  auth: { env: 'AUTH_SERVICE_URL', fallback: 'http://localhost:8001' },
  catalog: { env: 'CATALOG_SERVICE_URL', fallback: 'http://localhost:8002' },
  cart: { env: 'CART_SERVICE_URL', fallback: 'http://localhost:8003' },
  orders: { env: 'ORDERS_SERVICE_URL', fallback: 'http://localhost:8004' },
  notifications: { env: 'NOTIFICATIONS_SERVICE_URL', fallback: 'http://localhost:8005' },
  recommendations: { env: 'RECOMMENDATIONS_SERVICE_URL', fallback: 'http://localhost:8006' },
  assistant: { env: 'ASSISTANT_SERVICE_URL', fallback: 'http://localhost:8007' },
};

export const GENERIC = {
  badRequest: 'Solicitud inválida.',
  unauthorized: 'Debes iniciar sesión para continuar.',
  forbidden: 'Operación no permitida.',
  notFound: 'Recurso no encontrado.',
  tooLarge: 'La solicitud excede el tamaño permitido.',
  upstream: 'El servicio no está disponible en este momento. Inténtalo más tarde.',
  unavailable: 'El servicio no está disponible en este momento.',
  rateLimited: 'Demasiados intentos. Inténtalo más tarde.',
  internal: 'Operación no permitida.',
} as const;

const MAX_BODY_BYTES = 64 * 1024;
const MAX_SEGMENTS = 8;
const MAX_QUERY_LENGTH = 2048;
const UPSTREAM_TIMEOUT_MS = 15_000;
const STREAM_TIMEOUT_MS = 120_000;

/** Primer carácter alfanumérico (bloquea `.`, `..`, `.env`); resto: conjunto URL-safe sin `/ \ %`. */
const SEGMENT_RE = /^[A-Za-z0-9_~@:+-][A-Za-z0-9._~@:+-]{0,127}$/;

export function isSafeSegment(segment: unknown): segment is string {
  return typeof segment === 'string' && SEGMENT_RE.test(segment);
}

/** URL base validada de un microservicio (solo http/https, sin credenciales embebidas). */
export function serviceBaseUrl(service: ServiceName): URL {
  const { env, fallback } = SERVICE_ENV[service];
  const raw = process.env[env] || fallback;
  const url = new URL(raw);
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error(`Invalid ${env}`);
  }
  return url;
}

/**
 * Construye la URL de destino o devuelve null si algún segmento es inseguro.
 * `fixed` son segmentos confiables del servidor; `dynamic` provienen del cliente.
 */
export function buildServiceUrl(
  service: ServiceName,
  fixed: readonly string[],
  dynamic: readonly string[] = [],
  search = ''
): URL | null {
  if (dynamic.length > MAX_SEGMENTS || !dynamic.every(isSafeSegment)) return null;
  if (search.length > MAX_QUERY_LENGTH) return null;

  const base = serviceBaseUrl(service);
  const basePath = base.pathname.replace(/\/+$/, '');
  const prefix = `${basePath}/${fixed.join('/')}`;
  const tail = dynamic.map((s) => encodeURIComponent(s)).join('/');

  const url = new URL(base.origin);
  url.pathname = tail ? `${prefix}/${tail}` : prefix;
  url.search = search;

  // Defensa en profundidad: el resultado debe seguir en el mismo origen y bajo el prefijo.
  if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return null;
  return url;
}

export function errorResponse(status: number, detail: string): NextResponse {
  return NextResponse.json({ detail }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Segundos de `Retry-After` normalizados: entero 1–3600; ausente o inválido → 60. */
export function retryAfterSeconds(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 60;
  return Math.min(Math.max(Math.floor(n), 1), 3600);
}

/** 429 hacia el navegador con `Retry-After` (A07 / LLM10): la UI puede bloquear el reintento. */
export function tooManyRequestsResponse(retryAfter: unknown): NextResponse {
  return NextResponse.json(
    { detail: GENERIC.rateLimited },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfterSeconds(retryAfter)) } }
  );
}

/** 502 de pasarela: mensaje genérico + `request_id` para soporte (A09). Nunca detalle interno (A10). */
export function gatewayErrorResponse(requestId: string): NextResponse {
  return NextResponse.json(
    { detail: GENERIC.upstream, request_id: requestId },
    { status: 502, headers: { 'Cache-Control': 'no-store' } }
  );
}

type BodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/** Lee y parsea un cuerpo JSON con límite de tamaño. Cuerpo vacío → `undefined`. */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyResult> {
  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > maxBytes) return { ok: false, response: errorResponse(413, GENERIC.tooLarge) };

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: errorResponse(400, GENERIC.badRequest) };
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: errorResponse(413, GENERIC.tooLarge) };
  }
  if (!text.trim()) return { ok: true, body: undefined };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: errorResponse(400, GENERIC.badRequest) };
  }
}

/** Mensaje de error 4xx seguro: solo `detail` textual o la lista de validación (loc/msg) de FastAPI. */
function safeClientError(data: unknown, status: number): unknown {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return { detail: detail.slice(0, 300) };
  if (Array.isArray(detail)) {
    return {
      detail: detail.slice(0, 20).map((d) => ({
        loc: Array.isArray(d?.loc) ? d.loc.slice(0, 5) : undefined,
        msg: typeof d?.msg === 'string' ? d.msg.slice(0, 200) : 'Valor inválido',
      })),
    };
  }
  const fallback: Record<number, string> = {
    400: GENERIC.badRequest,
    401: GENERIC.unauthorized,
    403: GENERIC.forbidden,
    404: GENERIC.notFound,
  };
  return { detail: fallback[status] || GENERIC.badRequest };
}

/** Traduce la respuesta del microservicio a una respuesta segura para el navegador. */
export async function relayResponse(
  upstream: Response,
  service: ServiceName,
  requestId: string = crypto.randomUUID()
): Promise<NextResponse> {
  const log = { service, request_id: requestId };
  if (upstream.status === 204 || upstream.status === 205) {
    return new NextResponse(null, { status: upstream.status });
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    // Nunca se siguen ni se reenvían redirecciones de servicios internos (SSRF / open redirect).
    securityLog('warn', 'upstream.error', { ...log, status: upstream.status, reason: 'redirect' });
    return gatewayErrorResponse(requestId);
  }

  const data: unknown = await upstream.json().catch(() => null);

  if (upstream.status === 429) {
    securityLog('warn', 'ratelimit.exceeded', { ...log, source: 'upstream' });
    return tooManyRequestsResponse(upstream.headers.get('retry-after'));
  }
  if (upstream.status === 503) {
    // 503 = indisponibilidad deliberada (kill switch, presupuesto): el cliente la distingue de un fallo.
    securityLog('warn', 'upstream.error', { ...log, status: 503 });
    return errorResponse(503, GENERIC.unavailable);
  }
  if (upstream.status >= 500) {
    securityLog('error', 'upstream.error', { ...log, status: upstream.status });
    return gatewayErrorResponse(requestId);
  }
  if (upstream.status >= 400) {
    if (upstream.status === 401 || upstream.status === 403) {
      securityLog('warn', 'authz.denied', { ...log, status: upstream.status });
    }
    return NextResponse.json(safeClientError(data, upstream.status), { status: upstream.status });
  }
  return NextResponse.json(data ?? {}, { status: upstream.status });
}

export interface ProxyOptions {
  service: ServiceName;
  fixed: readonly string[];
  dynamic?: readonly string[];
  method: HttpMethod;
  /** Reenviar el cuerpo como SSE (asistente IA). */
  stream?: boolean;
  /** Cuerpo ya leído/validado; si se omite se lee del request en métodos con cuerpo. */
  body?: unknown;
  /** Cabeceras ya construidas (por defecto `buildForwardHeaders(request)`). */
  headers?: Headers;
}

/** Ejecuta la petición al microservicio con todas las salvaguardas. */
export async function proxyToService(request: NextRequest, opts: ProxyOptions): Promise<Response> {
  const requestId = requestIdFrom(request);
  const log = { service: opts.service, request_id: requestId };
  const search = new URL(request.url).search;
  let target: URL | null;
  try {
    target = buildServiceUrl(opts.service, opts.fixed, opts.dynamic ?? [], search);
  } catch {
    securityLog('error', 'upstream.unreachable', { ...log, reason: 'invalid_service_url' });
    return gatewayErrorResponse(requestId);
  }
  if (!target) {
    securityLog('warn', 'input.rejected', { ...log, reason: 'unsafe_path' });
    return errorResponse(400, GENERIC.badRequest);
  }

  let body = opts.body;
  if (body === undefined && (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH')) {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    body = parsed.body;
  }

  const headers = opts.headers ?? buildForwardHeaders(request);
  headers.set(REQUEST_ID_HEADER, requestId);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: opts.method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(opts.stream ? STREAM_TIMEOUT_MS : UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    securityLog('error', 'upstream.unreachable', { ...log, error });
    return gatewayErrorResponse(requestId);
  }

  if (opts.stream && upstream.ok && upstream.body) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  return relayResponse(upstream, opts.service, requestId);
}

type RouteContext = { params: Promise<{ slug?: string[] }> };
type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<Response>;

/**
 * Fábrica de handlers para rutas proxy del BFF (`/api/v1/<servicio>` y `/api/v1/<servicio>/[...slug]`).
 * Solo se exportan los métodos declarados; el resto responde 405 automáticamente (Next.js).
 */
export function createProxyRoute<M extends HttpMethod>(
  service: ServiceName,
  config: {
    fixed: readonly string[];
    methods: readonly M[];
    streamMethods?: readonly M[];
  }
): Record<M, RouteHandler> {
  const handlers = {} as Record<M, RouteHandler>;
  for (const method of config.methods) {
    handlers[method] = async (request, context) => {
      try {
        const params = await context.params;
        return await proxyToService(request, {
          service,
          fixed: config.fixed,
          dynamic: params?.slug ?? [],
          method,
          stream: config.streamMethods?.includes(method),
        });
      } catch (error) {
        securityLog('error', 'upstream.error', { service, method, error, request_id: requestIdFrom(request) });
        return errorResponse(500, GENERIC.internal);
      }
    };
  }
  return handlers;
}

/**
 * Traduce cualquier excepción (ApiError de los clientes BFF, errores de red, bugs) a una respuesta
 * genérica. Los 4xx conservan el código para la UX; el texto nunca proviene de `error.message`.
 */
export function routeErrorResponse(
  error: unknown,
  service: ServiceName | 'bff',
  requestId: string = crypto.randomUUID()
): NextResponse {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 429) {
    securityLog('warn', 'ratelimit.exceeded', { service, source: 'upstream', request_id: requestId });
    return tooManyRequestsResponse((error as { retryAfter?: unknown }).retryAfter);
  }
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (status === 401 || status === 403) securityLog('warn', 'authz.denied', { service, status });
    const msg: Record<number, string> = {
      401: GENERIC.unauthorized,
      403: GENERIC.forbidden,
      404: GENERIC.notFound,
      413: GENERIC.tooLarge,
    };
    return errorResponse(status, msg[status] || GENERIC.badRequest);
  }
  securityLog('error', 'upstream.error', { service, error, request_id: requestId });
  return gatewayErrorResponse(requestId);
}
