import { NextResponse, type NextRequest } from 'next/server';
import type { PaymentMethod } from '@/domain/models';
import { MAX_PER_USER, methodsFor } from '@/infrastructure/bff/paymentStore';
import { AuthorizationError, requireUser } from '@/infrastructure/bff/session';
import { GENERIC, errorResponse, readJsonBody } from '@/infrastructure/bff/serviceProxy';
import { PaymentMethodInput } from '@/infrastructure/bff/schemas';
import { securityLog } from '@/infrastructure/bff/securityLog';

/**
 * Métodos de pago SIMULADOS (sandbox). Endurecido:
 * - Requiere sesión verificada en el servidor (DAL), nunca la cabecera `x-user-id` del navegador.
 * - Almacén aislado POR USUARIO (antes era una lista global compartida entre todos los clientes).
 * - Nunca se guarda el número de tarjeta: solo marca y últimos 4 dígitos.
 */

/** Identificador estable del usuario; sin él no hay almacén (nunca un cubo compartido tipo "unknown"). */
function userKey(user: { id?: string; email?: string }): string {
  const key = user.id || user.email;
  if (!key) throw new AuthorizationError(401);
  return key;
}

function authError(error: unknown) {
  if (error instanceof AuthorizationError) return errorResponse(error.status, GENERIC.unauthorized);
  securityLog('error', 'upstream.error', { service: 'bff', route: 'payment-methods', error });
  return errorResponse(500, GENERIC.internal);
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(methodsFor(userKey(user)), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = userKey(user);
  } catch (error) {
    return authError(error);
  }

  const raw = await readJsonBody(request, 4 * 1024);
  if (!raw.ok) return raw.response;
  const parsed = PaymentMethodInput.safeParse(raw.body);
  if (!parsed.success) return errorResponse(422, GENERIC.badRequest);

  const list = methodsFor(userId);
  if (list.length >= MAX_PER_USER) return errorResponse(429, GENERIC.forbidden);

  const { card_number, card_brand, is_default } = parsed.data;
  const newPm: PaymentMethod = {
    id: `pm_sim_${crypto.randomUUID()}`,
    user_id: userId,
    card_brand:
      card_brand || (card_number.startsWith('4') ? 'Visa Sandbox' : card_number.startsWith('5') ? 'Mastercard Sandbox' : 'Tarjeta Sandbox'),
    card_last_4: card_number.slice(-4),
    is_default,
  };
  if (newPm.is_default) list.forEach((pm) => { pm.is_default = false; });
  list.push(newPm);

  return NextResponse.json(newPm, { status: 201, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
