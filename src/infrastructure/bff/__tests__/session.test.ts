// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const cookieJar = new Map<string, string>();
const headerJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (cookieJar.has(n) ? { value: cookieJar.get(n)! } : undefined) }),
  headers: async () => new Headers(Object.fromEntries(headerJar)),
}));

import { getSessionUser } from '../session';
import { SESSION_COOKIE } from '../sessionCookie';

afterEach(() => {
  cookieJar.clear();
  headerJar.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('DAL getSessionUser → /auth/me', () => {
  it('envía x-api-key de API Gateway y el X-Request-ID de la petición', async () => {
    vi.stubEnv('API_GATEWAY_KEY', 'gw-secret-key');
    cookieJar.set(SESSION_COOKIE, 'eyJh.eyJz.c2ln');
    headerJar.set('x-request-id', 'req-abcdef12');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"email":"a@b.cl"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const user = await getSessionUser();

    expect(user?.email).toBe('a@b.cl');
    const sent = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(sent.get('x-api-key')).toBe('gw-secret-key');
    expect(sent.get('x-request-id')).toBe('req-abcdef12');
    expect(sent.get('authorization')).toBe('Bearer eyJh.eyJz.c2ln');
  });
});
