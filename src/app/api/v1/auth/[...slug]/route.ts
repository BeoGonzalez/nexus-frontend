import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { buildForwardHeaders, sessionTokenFrom } from '@/infrastructure/bff/forwardHeaders';
import {
  GENERIC,
  buildServiceUrl,
  errorResponse,
  gatewayErrorResponse,
  proxyToService,
  readJsonBody,
  tooManyRequestsResponse,
} from '@/infrastructure/bff/serviceProxy';
import {
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  SESSION_COOKIE,
  clampMaxAge,
  sessionCookieOptions,
} from '@/infrastructure/bff/sessionCookie';
import { securityLog } from '@/infrastructure/bff/securityLog';
import { withGatewayKey } from '@/infrastructure/bff/gatewayKey';
import { revokeRefreshToken } from '@/infrastructure/bff/cognitoRevoke';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/infrastructure/bff/requestId';

/** Cabeceras para llamadas anónimas al servicio de auth (sin reenviar la sesión). */
const upstreamHeaders = () => withGatewayKey(new Headers({ 'Content-Type': 'application/json' }));

/**
 * BFF de autenticación (OWASP A01, A04, A05, A07, A10).
 *
 * - Solo se exponen las subrutas de la lista blanca (nada de proxy genérico al servicio de auth).
 * - Todos los cuerpos se validan con Zod antes de salir hacia el microservicio.
 * - Login/refresh: los JWT quedan EXCLUSIVAMENTE en cookies HttpOnly; el JSON al navegador no
 *   contiene tokens.
 * - Logout: invalida la sesión en el servidor borrando ambas cookies.
 * - Mensajes uniformes en login/recuperación para impedir la enumeración de usuarios.
 */

type Ctx = { params: Promise<{ slug: string[] }> };

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(1).max(256);
/** Misma política que el User Pool de Cognito (mín. 12, mayúscula, minúscula, número y símbolo). */
const strongPassword = z
  .string()
  .min(12)
  .max(256)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);
const code = z.string().trim().regex(/^[0-9]{4,10}$/);

const Schemas = {
  login: z.object({ email, password }).strict(),
  register: z
    .object({
      name: z.string().trim().min(1).max(100),
      email,
      password: strongPassword,
    })
    .strict(),
  confirm: z.object({ email, confirmation_code: code }).strict(),
  'forgot-password': z.object({ email }).strict(),
  'reset-password': z
    .object({ email, confirmation_code: code, new_password: strongPassword })
    .strict(),
  refresh: z.object({ email }).loose(),
} as const;

const GET_ALLOWED = new Set(['me', 'info', 'health']);

const MSG = {
  invalidCredentials: 'Credenciales inválidas.',
  forgot: 'Si la cuenta existe, recibirás un código de verificación en tu correo.',
  resend: 'Si la cuenta existe y está pendiente de confirmación, se reenvió el código.',
  register: 'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.',
  sessionExpired: 'Tu sesión expiró. Inicia sesión nuevamente.',
} as const;

function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  res.cookies.set(REFRESH_COOKIE, '', sessionCookieOptions(0));
  return res;
}

/** 429 del backend (5/min por email, 20/min por IP) → al navegador con su Retry-After. */
function limited(upstream: Response, requestId: string): NextResponse {
  securityLog('warn', 'ratelimit.exceeded', { service: 'auth', source: 'upstream', request_id: requestId });
  return tooManyRequestsResponse(upstream.headers.get('retry-after'));
}

async function callAuth(
  path: string,
  init: { body?: unknown; headers: Headers; search?: string },
  requestId: string
) {
  const url = buildServiceUrl('auth', ['api', 'v1', 'auth', path], [], init.search ?? '');
  if (!url) throw new Error('invalid auth url');
  init.headers.set(REQUEST_ID_HEADER, requestId);
  return fetch(url, {
    method: 'POST',
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
}

/** Crea la respuesta de sesión: tokens a cookies HttpOnly, JSON sin secretos. */
function sessionResponse(data: Record<string, unknown>, requestId: string, refreshFallback?: string): NextResponse {
  const token = sessionTokenFrom(data as { id_token?: string; access_token?: string; token?: string });
  if (!token) return gatewayErrorResponse(requestId);

  const maxAge = clampMaxAge(data.expires_in);
  const res = NextResponse.json({ authenticated: true, expires_in: maxAge }, { status: 200 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  const refresh = typeof data.refresh_token === 'string' ? data.refresh_token : refreshFallback;
  if (refresh) res.cookies.set(REFRESH_COOKIE, refresh, sessionCookieOptions(REFRESH_MAX_AGE));
  return res;
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { slug } = await context.params;
    const [action] = slug;
    if (slug.length !== 1 || !GET_ALLOWED.has(action)) return errorResponse(404, GENERIC.notFound);
    return await proxyToService(request, {
      service: 'auth',
      fixed: ['api', 'v1', 'auth', action],
      method: 'GET',
    });
  } catch (error) {
    securityLog('error', 'upstream.error', { service: 'auth', error });
    return errorResponse(500, GENERIC.internal);
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  const rid = requestIdFrom(request);
  try {
    const { slug } = await context.params;
    const [action] = slug;
    if (slug.length !== 1) return errorResponse(404, GENERIC.notFound);

    // --- Logout: invalidación real de la sesión en el servidor ---------------------------------
    if (action === 'logout') {
      securityLog('info', 'auth.logout', { request_id: rid });
      const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
      if (refreshToken) await revokeRefreshToken(refreshToken, rid);
      return clearSession(NextResponse.json({ success: true }, { status: 200 }));
    }

    // --- Reenvío de código (email por query) ---------------------------------------------------
    if (action === 'resend-code') {
      const parsed = email.safeParse(new URL(request.url).searchParams.get('email') ?? '');
      if (!parsed.success) return errorResponse(422, GENERIC.badRequest);
      const resent = await callAuth('resend-code', {
        headers: buildForwardHeaders(request),
        search: `?email=${encodeURIComponent(parsed.data)}`,
      }, rid).catch((error) => {
        securityLog('error', 'upstream.unreachable', { service: 'auth', error, request_id: rid });
        return null;
      });
      if (resent?.status === 429) return limited(resent, rid);
      return NextResponse.json({ message: MSG.resend }, { status: 200 });
    }

    if (!(action in Schemas)) return errorResponse(404, GENERIC.notFound);
    const schema = Schemas[action as keyof typeof Schemas];

    const raw = await readJsonBody(request, 8 * 1024);
    if (!raw.ok) return raw.response;
    const parsed = schema.safeParse(raw.body ?? {});
    if (!parsed.success) {
      securityLog('info', 'input.rejected', { service: 'auth', action, request_id: rid });
      return errorResponse(422, action === 'login' ? MSG.invalidCredentials : GENERIC.badRequest);
    }

    // --- Refresh: el refresh token sale de la cookie HttpOnly, nunca del navegador -------------
    if (action === 'refresh') {
      const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
      if (!refreshToken) return clearSession(errorResponse(401, MSG.sessionExpired));
      const upstream = await callAuth('refresh', {
        headers: buildForwardHeaders(request),
        body: { email: (parsed.data as { email: string }).email, refresh_token: refreshToken },
      }, rid);
      if (upstream.status === 429) return limited(upstream, rid);
      if (!upstream.ok) {
        securityLog('warn', 'auth.refresh.failure', { status: upstream.status, request_id: rid });
        return clearSession(errorResponse(401, MSG.sessionExpired));
      }
      const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
      return sessionResponse(data, rid, refreshToken);
    }

    // --- Login --------------------------------------------------------------------------------
    if (action === 'login') {
      const upstream = await callAuth('login', { headers: upstreamHeaders(), body: parsed.data }, rid);
      if (upstream.status === 429) return limited(upstream, rid);
      if (!upstream.ok) {
        securityLog('warn', 'auth.login.failure', { status: upstream.status, request_id: rid });
        if (upstream.status >= 500) return gatewayErrorResponse(rid);
        // Mismo mensaje y código para usuario inexistente, contraseña errónea o cuenta sin confirmar.
        return clearSession(errorResponse(401, MSG.invalidCredentials));
      }
      const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
      securityLog('info', 'auth.login.success', { request_id: rid });
      return sessionResponse(data, rid);
    }

    // --- Forgot password: respuesta uniforme exista o no la cuenta ----------------------------
    if (action === 'forgot-password') {
      const upstream = await callAuth('forgot-password', {
        headers: upstreamHeaders(),
        body: parsed.data,
      }, rid).catch(() => null);
      if (upstream?.status === 429) return limited(upstream, rid);
      if (upstream && upstream.status >= 500) securityLog('error', 'upstream.error', { service: 'auth', action, request_id: rid });
      return NextResponse.json({ message: MSG.forgot }, { status: 200 });
    }

    // --- Register / confirm / reset-password ---------------------------------------------------
    const upstream = await callAuth(action, {
      headers: upstreamHeaders(),
      body: parsed.data,
    }, rid);
    if (upstream.status === 429) return limited(upstream, rid);
    if (!upstream.ok) {
      if (upstream.status >= 500) {
        securityLog('error', 'upstream.error', { service: 'auth', action, status: upstream.status, request_id: rid });
        return gatewayErrorResponse(rid);
      }
      return errorResponse(
        upstream.status === 422 ? 422 : 400,
        action === 'register' ? MSG.register : GENERIC.badRequest
      );
    }
    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    // Nunca reenviar tokens que el backend pudiera incluir (p. ej. auto-login tras confirmar).
    const { access_token: _a, id_token: _i, refresh_token: _r, token: _t, ...safe } = data;
    void _a; void _i; void _r; void _t;
    return NextResponse.json(safe, { status: upstream.status });
  } catch (error) {
    securityLog('error', 'upstream.unreachable', { service: 'auth', error, request_id: rid });
    return gatewayErrorResponse(rid);
  }
}
