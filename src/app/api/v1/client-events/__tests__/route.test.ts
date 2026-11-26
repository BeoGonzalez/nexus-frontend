// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const COLLECTOR = 'https://faro-collector-prod-sa-east-1.grafana.net/collect/abc123';
const PAYLOAD = { meta: { app: { name: 'nexus-frontend' } }, measurements: [{ type: 'web-vitals', values: { lcp: 1200 } }] };

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://tienda.example/api/v1/client-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BFF /api/v1/client-events (Faro por el mismo origen: los bloqueadores no lo cortan)', () => {
  it('sin colector configurado descarta en silencio y no llama a nadie', async () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await POST(post(PAYLOAD))).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reenvía el lote al colector configurado (nunca a otra URL) y responde 202', async () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', COLLECTOR);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(post(PAYLOAD, { 'x-faro-session-id': 'Ab3dE6gH9k' }));
    expect(res.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(COLLECTOR);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-faro-session-id')).toBe('Ab3dE6gH9k');
  });

  it('no reenvía cookies, Authorization ni un session id con forma extraña', async () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', COLLECTOR);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    await POST(post(PAYLOAD, { cookie: 'nexus_session=secreto', authorization: 'Bearer x', 'x-faro-session-id': '../../etc' }));
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('x-faro-session-id')).toBeNull();
  });

  it('rechaza lo que no es JSON (415), el JSON inválido (400) y los lotes grandes (413)', async () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', COLLECTOR);
    vi.stubGlobal('fetch', vi.fn());
    expect((await POST(post('a=1', { 'content-type': 'application/x-www-form-urlencoded' }))).status).toBe(415);
    expect((await POST(post('{no es json'))).status).toBe(400);
    expect((await POST(post({ big: 'x'.repeat(300_000) }))).status).toBe(413);
  });

  it('propaga el 429 del colector (Faro espera) y absorbe sus caídas sin reintentos en bucle', async () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', COLLECTOR);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { 'retry-after': '30' } })));
    const limited = await POST(post(PAYLOAD));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('30');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('colector caído')));
    expect((await POST(post(PAYLOAD))).status).toBe(202);
  });
});
