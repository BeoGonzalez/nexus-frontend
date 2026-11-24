import 'server-only';

/**
 * OWASP A09 — Logging estructurado y redactado del BFF.
 *
 * - Una línea JSON por evento (apta para CloudWatch / Loki / Datadog).
 * - Nunca se registran tokens, cookies, cabeceras de autorización, contraseñas ni correos completos.
 * - Los errores se reducen a nombre + mensaje acotado; jamás se serializa el objeto completo ni el stack.
 */

type Level = 'info' | 'warn' | 'error';

export type SecurityEvent =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.refresh.failure'
  | 'auth.logout'
  | 'authz.denied'
  | 'csrf.origin_rejected'
  | 'ratelimit.exceeded'
  | 'input.rejected'
  | 'upstream.error'
  | 'upstream.unreachable'
  | 'action.error'
  | 'notification.sent';

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|session|card|cvv|key|otp|code/i;
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+)/g;
const JWT_RE = /[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/g;

/** Enmascara un correo: juan.perez@nexus.cl → j***@nexus.cl */
export function maskEmail(value: string): string {
  return value.replace(EMAIL_RE, '$1***@$2');
}

function redactString(value: string): string {
  return maskEmail(value.replace(JWT_RE, '[REDACTED_JWT]')).slice(0, 300);
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[…]';
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return { name: value.name, message: redactString(value.message) };
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 25)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return '[unserializable]';
}

export function securityLog(level: Level, event: SecurityEvent, details: Record<string, unknown> = {}): void {
  if (process.env.VITEST && level !== 'error') return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redact(details) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
