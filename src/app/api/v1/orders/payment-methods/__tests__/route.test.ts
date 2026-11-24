// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: { id: 'user-a' } as { id?: string; email?: string } | null }));
vi.mock('@/infrastructure/bff/session', () => {
  class AuthorizationError extends Error {
    constructor(public status: 401 | 403) {
      super('denied');
    }
  }
  return {
    AuthorizationError,
    requireUser: vi.fn(async () => {
      if (!state.user) throw new AuthorizationError(401);
      return state.user;
    }),
  };
});

import { GET, POST } from '../route';
import { MAX_USERS, paymentStoreSize, resetPaymentStore } from '@/infrastructure/bff/paymentStore';

const post = (body: unknown) =>
  new NextRequest('http://shop.test/api/v1/orders/payment-methods', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  resetPaymentStore();
  state.user = { id: 'user-a' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('payment-methods (sandbox): aislamiento y límites', () => {
  it('una sesión sin id ni email no cae en un almacén compartido: 401', async () => {
    state.user = {};
    expect((await GET()).status).toBe(401);
    expect((await POST(post({ card_number: '4111111111111111', is_default: false }))).status).toBe(401);
  });

  it('las tarjetas de un usuario no las ve otro', async () => {
    const created = await POST(post({ card_number: '4111111111111111', is_default: false }));
    expect(created.status).toBe(201);
    state.user = { id: 'user-b' };
    const list = (await (await GET()).json()) as Array<{ card_last_4: string }>;
    expect(list.some((pm) => pm.card_last_4 === '1111')).toBe(false);
  });

  it('nunca devuelve ni guarda el número completo de la tarjeta', async () => {
    const res = await POST(post({ card_number: '4111111111111111', is_default: false }));
    expect(JSON.stringify(await res.json())).not.toContain('4111111111111111');
  });

  it('el almacén en memoria está acotado en número de usuarios (sin crecimiento ilimitado)', async () => {
    for (let i = 0; i < MAX_USERS + 50; i++) {
      state.user = { id: `u-${i}` };
      await GET();
    }
    state.user = { id: 'u-0' };
    // El más antiguo fue expulsado y se regenera con los valores por defecto (sin error).
    expect((await GET()).status).toBe(200);
    expect(paymentStoreSize()).toBeLessThanOrEqual(MAX_USERS);
  });
});
