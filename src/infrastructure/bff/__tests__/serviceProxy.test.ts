// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { buildServiceUrl, createProxyRoute, isSafeSegment, routeErrorResponse } from '../serviceProxy';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isSafeSegment / buildServiceUrl (OWASP A01: SSRF y path traversal)', () => {
  it.each(['..', '.', '.env', 'a/b', 'a\\b', '%2e%2e', 'a b', '', 'x\r\ny'])('rechaza el segmento %j', (seg) => {
    expect(isSafeSegment(seg)).toBe(false);
    expect(buildServiceUrl('cart', ['api', 'v1', 'cart'], [seg])).toBeNull();
  });

  it('acepta segmentos legítimos y mantiene el prefijo y el origen del servicio', () => {
    const url = buildServiceUrl('cart', ['api', 'v1', 'cart'], ['items', '3f6678d1-829b-494e-a94c-f49ff420ebad']);
    expect(url?.toString()).toBe('http://localhost:8003/api/v1/cart/items/3f6678d1-829b-494e-a94c-f49ff420ebad');
  });

  it('limita la cantidad de segmentos y la longitud de la query', () => {
    expect(buildServiceUrl('cart', ['api'], Array(9).fill('a'))).toBeNull();
    expect(buildServiceUrl('cart', ['api'], [], `?q=${'a'.repeat(3000)}`)).toBeNull();
  });
});

describe('createProxyRoute', () => {
  const route = createProxyRoute('cart', { fixed: ['api', 'v1', 'cart'], methods: ['GET', 'POST'] });
  const ctx = (slug: string[]) => ({ params: Promise.resolve({ slug }) });

  it('bloquea traversal (400) sin contactar al microservicio', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await route.GET(new NextRequest('http://localhost/api/v1/cart/x'), ctx(['..', '..', 'admin']));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no sigue redirecciones del servicio interno', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await route.GET(new NextRequest('http://localhost/api/v1/cart/items'), ctx(['items']));
    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
    expect(res.status).toBe(502);
  });

  it('5xx y errores de red → mensaje genérico (sin error.message)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.3.17:8003')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await route.GET(new NextRequest('http://localhost/api/v1/cart/items'), ctx(['items']));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.3.17');
  });

  it('rechaza cuerpos JSON inválidos o demasiado grandes', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const bad = await route.POST(
      new NextRequest('http://localhost/api/v1/cart/items', { method: 'POST', body: '{nope' }),
      ctx(['items'])
    );
    expect(bad.status).toBe(400);
    const big = await route.POST(
      new NextRequest('http://localhost/api/v1/cart/items', { method: 'POST', body: JSON.stringify({ a: 'x'.repeat(70_000) }) }),
      ctx(['items'])
    );
    expect(big.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('X-Request-ID en el proxy hacia microservicios (A09)', () => {
  const route = createProxyRoute('cart', { fixed: ['api', 'v1', 'cart'], methods: ['GET'] });
  const ctx = { params: Promise.resolve({ slug: ['items'] }) };
  const withId = () =>
    new NextRequest('http://localhost/api/v1/cart/items', { headers: { 'x-request-id': 'req-12345678' } });

  it('reenvía el id al microservicio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await route.GET(withId(), ctx);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-request-id')).toBe('req-12345678');
  });

  it('genera uno si falta (petición sin pasar por el proxy)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await route.GET(new NextRequest('http://localhost/api/v1/cart/items'), ctx);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-request-id')).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  });

  it('el 502 incluye request_id y nada del detalle del backend; el log lo registra', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"detail":"Error interno del servidor.","request_id":"backend-999999"}', { status: 500 }))
    );
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await route.GET(withId(), ctx);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ detail: expect.any(String), request_id: 'req-12345678' });
    expect(JSON.parse(String(errors.mock.calls[0][0])).request_id).toBe('req-12345678');
  });

  it('los 4xx no exponen request_id en el cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"No encontrado"}', { status: 404 })));
    const res = await route.GET(withId(), ctx);
    expect(Object.keys(await res.json())).toEqual(['detail']);
  });
});

describe('429 del backend (A07/LLM10)', () => {
  const route = createProxyRoute('cart', { fixed: ['api', 'v1', 'cart'], methods: ['GET'] });
  const ctx = { params: Promise.resolve({ slug: ['items'] }) };
  const r429 = (headers: Record<string, string> = {}) =>
    vi.fn().mockResolvedValue(new Response('{"detail":"Too many"}', { status: 429, headers }));

  it('propaga 429 con Retry-After y mensaje en español', async () => {
    vi.stubGlobal('fetch', r429({ 'retry-after': '42' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await route.GET(new NextRequest('http://localhost/api/v1/cart/items'), ctx);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('42');
    expect(await res.json()).toEqual({ detail: 'Demasiados intentos. Inténtalo más tarde.' });
  });

  it.each([[{}, '60'], [{ 'retry-after': 'mañana' }, '60'], [{ 'retry-after': '999999' }, '3600'], [{ 'retry-after': '0' }, '1']])(
    'normaliza Retry-After %j → %s',
    async (headers, expected) => {
      vi.stubGlobal('fetch', r429(headers as Record<string, string>));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const res = await route.GET(new NextRequest('http://localhost/api/v1/cart/items'), ctx);
      expect(res.headers.get('retry-after')).toBe(expected);
    }
  );

  it('routeErrorResponse mapea un ApiError 429 conservando retryAfter', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = routeErrorResponse({ status: 429, retryAfter: 15 }, 'orders');
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('15');
    expect((await res.json()).detail).toBe('Demasiados intentos. Inténtalo más tarde.');
  });
});
