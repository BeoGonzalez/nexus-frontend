import { NextResponse } from 'next/server';

/**
 * Liveness del proceso Next.js para el HEALTHCHECK del contenedor y el target group del ALB.
 * No consulta microservicios (un fallo del backend no debe reciclar el frontend) y no expone
 * versión, entorno ni dependencias (OWASP A02).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
