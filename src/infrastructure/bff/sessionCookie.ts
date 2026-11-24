/**
 * Nombres y atributos de las cookies de sesión del BFF (OWASP A04 / A07).
 *
 * - Los JWT de Cognito NUNCA llegan a JavaScript del navegador: viven solo en cookies HttpOnly.
 * - En producción se usa el prefijo `__Host-` (exige Secure, Path=/ y sin Domain → no puede ser
 *   sobrescrita por subdominios). En desarrollo (http://localhost) se omite el prefijo porque
 *   Safari no acepta cookies Secure sobre HTTP.
 *
 * Este módulo es isomórfico a propósito (sin `server-only`): solo exporta constantes y funciones
 * puras, de modo que también lo pueden usar los tests.
 */

const isProd = process.env.NODE_ENV === 'production';
const prefix = isProd ? '__Host-' : '';

/** Cookie con el ID token de Cognito (lo que el BFF reenvía como Bearer a los microservicios). */
export const SESSION_COOKIE = `${prefix}nexus_session`;
/** Cookie con el refresh token de Cognito; solo la lee la ruta /api/v1/auth/refresh. */
export const REFRESH_COOKIE = `${prefix}nexus_refresh`;
/** Identificador opaco de invitado (carrito anónimo). No es una credencial de usuario. */
export const GUEST_COOKIE = 'nexus_guest_id';

/** Duración por defecto del ID token de Cognito si el backend no informa `expires_in`. */
export const DEFAULT_SESSION_MAX_AGE = 60 * 60; // 1 h
/** Vida máxima del refresh token en la cookie (Cognito por defecto: 30 días). */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict' | 'lax';
  path: string;
  maxAge: number;
}

export function sessionCookieOptions(maxAge: number): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    // Lax: permite volver desde el Hosted UI de Cognito con sesión; los métodos que mutan además
    // pasan por la verificación de Origin en src/proxy.ts (defensa CSRF).
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

/** Acota `expires_in` del backend a un rango sano (1 min – 24 h). */
export function clampMaxAge(expiresIn: unknown, fallback = DEFAULT_SESSION_MAX_AGE): number {
  const n = typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? Math.floor(expiresIn) : fallback;
  return Math.min(Math.max(n, 60), 60 * 60 * 24);
}
