import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { SESSION_COOKIE } from './sessionCookie';
import { buildServiceUrl } from './serviceProxy';
import { securityLog } from './securityLog';
import { withGatewayKey } from './gatewayKey';
import { REQUEST_ID_HEADER, resolveRequestId } from './requestId';

/**
 * Data Access Layer de sesión (OWASP A01 / A07).
 *
 * Única fuente de verdad en el servidor sobre "quién es" el usuario: el JWT de la cookie HttpOnly se
 * valida contra el microservicio de autenticación (que verifica firma y expiración con Cognito).
 * Se usa en Server Components, Server Actions y Route Handlers; nunca se confía en el cliente
 * ni únicamente en src/proxy.ts.
 */

const SessionUserSchema = z
  .object({
    id: z.string().max(128).optional(),
    name: z.string().max(200).optional().nullable(),
    email: z.string().max(320).optional(),
    role: z.string().max(64).optional().nullable(),
    is_admin: z.boolean().optional(),
    groups: z.array(z.string().max(128)).max(50).optional(),
  })
  .loose();

export type ServerSessionUser = z.infer<typeof SessionUserSchema>;

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? 'unauthenticated' : 'forbidden');
    this.name = 'AuthorizationError';
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Usuario autenticado (memoizado por request) o null. Falla cerrado ante cualquier error. */
export const getSessionUser = cache(async (): Promise<ServerSessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const url = buildServiceUrl('auth', ['api', 'v1', 'auth', 'me']);
  if (!url) return null;

  const requestId = resolveRequestId((await headers()).get(REQUEST_ID_HEADER));
  try {
    const res = await fetch(url, {
      headers: withGatewayKey(
        new Headers({ Authorization: `Bearer ${token}`, Accept: 'application/json', [REQUEST_ID_HEADER]: requestId })
      ),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const parsed = SessionUserSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch (error) {
    securityLog('error', 'upstream.unreachable', { service: 'auth', op: 'session', error, request_id: requestId });
    return null;
  }
});

export function isAdminUser(user: ServerSessionUser | null): boolean {
  if (!user) return false;
  return user.is_admin === true || user.role === 'admin' || (user.groups ?? []).includes('admins');
}

export async function requireUser(): Promise<ServerSessionUser> {
  const user = await getSessionUser();
  if (!user) {
    securityLog('warn', 'authz.denied', { reason: 'unauthenticated' });
    throw new AuthorizationError(401);
  }
  return user;
}

export async function requireAdmin(): Promise<ServerSessionUser> {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    securityLog('warn', 'authz.denied', { reason: 'not_admin', user: user.id });
    throw new AuthorizationError(403);
  }
  return user;
}
