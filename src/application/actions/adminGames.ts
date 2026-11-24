'use server';

import { updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { AuthorizationError, getSessionToken, requireAdmin } from '@/infrastructure/bff/session';
import { buildServiceUrl } from '@/infrastructure/bff/serviceProxy';
import { withGatewayKey } from '@/infrastructure/bff/gatewayKey';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/infrastructure/bff/requestId';
import { AdjustStockInput, CreateProductInput } from '@/infrastructure/bff/schemas';
import { securityLog } from '@/infrastructure/bff/securityLog';
import type { VideoGame } from '@/domain/models';

/**
 * Server Actions del panel admin (OWASP A01, A05, A09, A10).
 *
 * - `requireAdmin()` del DAL en cada acción: el filtro de src/proxy.ts no cuenta como autorización.
 * - Entrada validada con Zod antes de salir hacia catalog-service.
 * - Solo las operaciones que el backend expone: `POST /products` y `PATCH /products/{id}/stock`.
 *   Editar y eliminar no existen en catalog-service, así que no se ofrecen.
 * - Errores genéricos al cliente; detalle solo en el log estructurado con `request_id`.
 */

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

const DENIED = 'Operación no permitida';
const INVALID = 'Datos inválidos';

async function catalogFetch(path: string[], method: 'POST' | 'PATCH', body: unknown) {
  const url = buildServiceUrl('catalog', ['api', 'v1', 'catalog', 'products'], path);
  if (!url) throw new Error('invalid catalog url');
  const token = await getSessionToken();
  const requestId = resolveRequestId((await headers()).get(REQUEST_ID_HEADER));
  const h = withGatewayKey(
    new Headers({ 'Content-Type': 'application/json', [REQUEST_ID_HEADER]: requestId })
  );
  if (token) h.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, {
    method,
    headers: h,
    body: JSON.stringify(body),
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  return { res, requestId };
}

function fail(op: string, error: unknown): ActionResult<never> {
  if (!(error instanceof AuthorizationError)) securityLog('error', 'action.error', { op, error });
  return { success: false, error: DENIED };
}

export async function createProductAction(input: unknown): Promise<ActionResult<VideoGame>> {
  try {
    await requireAdmin();
    const parsed = CreateProductInput.safeParse(input);
    if (!parsed.success) return { success: false, error: INVALID };

    const { res, requestId } = await catalogFetch([], 'POST', parsed.data);
    if (!res.ok) {
      securityLog(res.status >= 500 ? 'error' : 'warn', 'action.error', {
        op: 'createProduct',
        status: res.status,
        request_id: requestId,
      });
      return { success: false, error: DENIED };
    }
    const created = (await res.json()) as VideoGame;
    updateTag('catalog');
    return { success: true, data: created };
  } catch (error) {
    return fail('createProduct', error);
  }
}

export async function adjustStockAction(id: unknown, delta: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = AdjustStockInput.safeParse({ id, delta });
    if (!parsed.success) return { success: false, error: INVALID };

    const { res, requestId } = await catalogFetch([parsed.data.id, 'stock'], 'PATCH', { delta: parsed.data.delta });
    if (!res.ok) {
      securityLog(res.status >= 500 ? 'error' : 'warn', 'action.error', {
        op: 'adjustStock',
        status: res.status,
        request_id: requestId,
      });
      return { success: false, error: DENIED };
    }
    const result = (await res.json().catch(() => ({}))) as { updated?: unknown };
    if (result.updated === false) {
      return { success: false, error: 'No hay stock suficiente para restar esa cantidad' };
    }
    updateTag('catalog');
    return { success: true };
  } catch (error) {
    return fail('adjustStock', error);
  }
}
