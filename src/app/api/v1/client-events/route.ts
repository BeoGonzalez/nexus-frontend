import { NextResponse, type NextRequest } from 'next/server';
import { GENERIC, errorResponse, readJsonBody } from '@/infrastructure/bff/serviceProxy';
import { securityLog } from '@/infrastructure/bff/securityLog';
import { faroConfig } from '@/infrastructure/observability/faro';

/**
 * Reenvío de Grafana Faro por el mismo origen (Web Vitals, errores de JS, sesiones).
 *
 * Los bloqueadores de anuncios (uBlock, Brave, AdGuard) cortan cualquier petición del navegador a
 * `faro-collector-*.grafana.net`, así que sin esto el dashboard del frontend queda en "No data" para casi todos
 * los visitantes. El navegador envía a esta ruta y el servidor reenvía al colector configurado.
 *
 * - Destino fijo: solo la URL de `NEXT_PUBLIC_FARO_URL` (validada https). El cliente no elige a dónde se envía.
 * - Solo JSON, con límite de tamaño. Nunca se reenvían cookies ni Authorization.
 * - El rate limit por IP lo aplica `proxy.ts` (regla `api-write`).
 */
const MAX_BATCH_BYTES = 256 * 1024;
const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TIMEOUT_MS = 5_000;

export async function POST(request: NextRequest) {
  const config = faroConfig();
  if (!config) return new NextResponse(null, { status: 204 });

  const contentType = request.headers.get('content-type') || '';
  if (!/^(application\/json|text\/plain)\b/i.test(contentType)) {
    return errorResponse(415, GENERIC.badRequest);
  }
  const body = await readJsonBody(request, MAX_BATCH_BYTES);
  if (!body.ok) return body.response;
  if (body.body === undefined) return new NextResponse(null, { status: 204 });

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const sessionId = request.headers.get('x-faro-session-id');
  if (sessionId && SESSION_ID.test(sessionId)) headers.set('x-faro-session-id', sessionId);

  try {
    const upstream = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (upstream.status === 429) {
      const res = new NextResponse(null, { status: 429 });
      const retryAfter = upstream.headers.get('retry-after');
      if (retryAfter) res.headers.set('Retry-After', retryAfter);
      return res;
    }
    if (!upstream.ok) securityLog('warn', 'upstream.error', { service: 'faro', status: upstream.status });
  } catch (error) {
    securityLog('warn', 'upstream.unreachable', { service: 'faro', error });
  }
  // 202 aunque el colector falle: la telemetría nunca debe provocar reintentos en bucle desde el navegador.
  return new NextResponse(null, { status: 202 });
}
