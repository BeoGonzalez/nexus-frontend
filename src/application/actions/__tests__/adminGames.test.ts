// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ admin: true }));
vi.mock('@/infrastructure/bff/session', () => {
  class AuthorizationError extends Error {
    constructor(public status: 401 | 403) {
      super('denied');
    }
  }
  return {
    AuthorizationError,
    requireAdmin: vi.fn(async () => {
      if (!state.admin) throw new AuthorizationError(403);
      return { id: 'admin-1', is_admin: true };
    }),
    getSessionToken: vi.fn(async () => 'eyJh.eyJz.c2ln'),
  };
});
vi.mock('next/cache', () => ({ updateTag: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-request-id': 'req-admin-0001' }) }));

import { adjustStockAction, createProductAction } from '../adminGames';
import { updateTag } from 'next/cache';

const UUID = '3f6678d1-829b-494e-a94c-f49ff420ebad';
const valid = {
  title: 'Metroid Prime 4',
  description: 'Aventura',
  price_clp: 59990,
  stock: 10,
  platform_name: 'Nintendo Switch',
  genre_names: ['Aventura'],
  image_url: 'https://bucket.s3.amazonaws.com/mp4.jpg',
};

beforeEach(() => {
  state.admin = true;
  vi.stubEnv('API_GATEWAY_KEY', 'gw-key-123456');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('createProductAction (A01/A05)', () => {
  it('un usuario sin rol admin recibe "Operación no permitida" y no se contacta al catálogo', async () => {
    state.admin = false;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await createProductAction(valid)).toEqual({ success: false, error: 'Operación no permitida' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['precio negativo', { ...valid, price_clp: -1 }],
    ['imagen no https', { ...valid, image_url: 'javascript:alert(1)' }],
    ['título vacío', { ...valid, title: '' }],
  ])('rechaza entrada inválida (%s) sin llamar al backend', async (_n, input) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await createProductAction(input)).toEqual({ success: false, error: 'Datos inválidos' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('crea con POST /api/v1/catalog/products, sesión, API key y request id; revalida el catálogo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: UUID, ...valid }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await createProductAction(valid);
    expect(res).toEqual({ success: true, data: expect.objectContaining({ id: UUID }) });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/catalog\/products$/);
    expect(init.method).toBe('POST');
    const h = new Headers(init.headers);
    expect(h.get('authorization')).toBe('Bearer eyJh.eyJz.c2ln');
    expect(h.get('x-api-key')).toBe('gw-key-123456');
    expect(h.get('x-request-id')).toBe('req-admin-0001');
    expect(JSON.parse(init.body)).toEqual(valid);
    expect(updateTag).toHaveBeenCalledWith('catalog');
  });

  it('un error del backend devuelve un mensaje genérico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"psycopg2 boom"}', { status: 500 })));
    expect(await createProductAction(valid)).toEqual({ success: false, error: 'Operación no permitida' });
  });
});

describe('adjustStockAction', () => {
  it.each([
    ['id no UUID', '../../admin', 1],
    ['delta 0', UUID, 0],
    ['delta no entero', UUID, 1.5],
    ['delta enorme', UUID, 1_000_000],
  ])('rechaza %s', async (_n, id, delta) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await adjustStockAction(id, delta)).toEqual({ success: false, error: 'Datos inválidos' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía PATCH /api/v1/catalog/products/{uuid}/stock con {delta}', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ product_id: UUID, updated: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await adjustStockAction(UUID, -2)).toEqual({ success: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/api/v1/catalog/products/${UUID}/stock$`));
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ delta: -2 });
  });

  it('sin rol admin no ajusta', async () => {
    state.admin = false;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await adjustStockAction(UUID, 1)).toEqual({ success: false, error: 'Operación no permitida' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el backend no pudo reservar stock (updated:false) lo informa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ updated: false }), { status: 200 })));
    expect(await adjustStockAction(UUID, -50)).toEqual({
      success: false,
      error: 'No hay stock suficiente para restar esa cantidad',
    });
  });
});
