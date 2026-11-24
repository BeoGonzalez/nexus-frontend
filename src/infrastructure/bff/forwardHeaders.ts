/**
 * Cabeceras que el BFF (rutas /api/v1/* de Next.js) reenvía a los microservicios.
 *
 * Seguridad: la identidad la decide el backend validando el JWT de Cognito. NUNCA se reenvían
 * cabeceras X-User-* del navegador (antes permitían hacerse pasar por otro usuario o por admin).
 * El JWT sale de la cookie HttpOnly de sesión; un `Authorization` explícito solo se acepta para
 * clientes no-navegador (scripts, pruebas de integración).
 * Invitados: la cookie nexus_guest_id viaja como X-Guest-Id y el backend la aísla como "guest:<uuid>".
 */

import { GUEST_COOKIE, SESSION_COOKIE } from './sessionCookie';
import { withGatewayKey } from './gatewayKey';
import { REQUEST_ID_HEADER, isValidRequestId } from './requestId';

interface ForwardableRequest {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}

const PASSTHROUGH_HEADERS = ['idempotency-key'];

/** Solo valores con forma de Bearer JWT (base64url con puntos), sin saltos de línea ni espacios extra. */
const BEARER_RE = /^Bearer [A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/;
const JWT_RE = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/;
const GUEST_RE = /^(guest-)?[0-9a-zA-Z-]{8,64}$/;
const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export function buildForwardHeaders(request: ForwardableRequest): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const authHeader = request.headers.get('authorization');
  if (sessionCookie && JWT_RE.test(sessionCookie)) {
    headers.set('authorization', `Bearer ${sessionCookie}`);
  } else if (authHeader && BEARER_RE.test(authHeader)) {
    headers.set('authorization', authHeader);
  }

  for (const name of PASSTHROUGH_HEADERS) {
    const value = request.headers.get(name);
    if (value && IDEMPOTENCY_RE.test(value)) headers.set(name, value);
  }

  // A09: correlación. src/proxy.ts garantiza un id válido; aquí solo se reenvía si lo es.
  const requestId = request.headers.get(REQUEST_ID_HEADER);
  if (isValidRequestId(requestId)) headers.set(REQUEST_ID_HEADER, requestId);

  if (!headers.has('authorization')) {
    const guestId = request.cookies.get(GUEST_COOKIE)?.value;
    if (guestId && GUEST_RE.test(guestId)) headers.set('x-guest-id', guestId);
  }

  return withGatewayKey(headers);
}

/**
 * Token de sesión a guardar tras login/refresh: el ID token de Cognito (incluye email y
 * cognito:groups, que los microservicios usan para el correo de la orden y el rol admin).
 */
export function sessionTokenFrom(data: { id_token?: string; access_token?: string; token?: string }): string {
  return data.id_token || data.access_token || data.token || '';
}
