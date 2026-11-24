import 'server-only';
import type { PaymentMethod } from '@/domain/models';

/**
 * Almacén en memoria de métodos de pago SIMULADOS (sandbox), aislado por usuario (OWASP A01) y acotado
 * (A06/LLM-style unbounded consumption): como mucho `MAX_USERS` usuarios, expulsando al menos reciente.
 * Nunca guarda el número de tarjeta: solo marca y últimos 4 dígitos.
 */

export const MAX_USERS = 5_000;
export const MAX_PER_USER = 10;

const DEFAULTS: ReadonlyArray<Omit<PaymentMethod, 'user_id'>> = [
  { id: 'pm_sim_visa_sandbox', card_brand: 'Visa Sandbox', card_last_4: '4242', is_default: true },
  { id: 'pm_sim_mc_sandbox', card_brand: 'Mastercard Sandbox', card_last_4: '5555', is_default: false },
];

const STORE = new Map<string, PaymentMethod[]>();

export function methodsFor(userId: string): PaymentMethod[] {
  let list = STORE.get(userId);
  if (list) {
    STORE.delete(userId); // reinsertar = marcar como el más reciente (orden de inserción del Map)
  } else {
    list = DEFAULTS.map((pm) => ({ ...pm, user_id: userId }));
  }
  STORE.set(userId, list);
  while (STORE.size > MAX_USERS) {
    const oldest = STORE.keys().next().value;
    if (oldest === undefined) break;
    STORE.delete(oldest);
  }
  return list;
}

export function paymentStoreSize(): number {
  return STORE.size;
}

export function resetPaymentStore(): void {
  STORE.clear();
}
