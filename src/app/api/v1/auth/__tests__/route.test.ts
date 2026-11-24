// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../[...slug]/route';
import { REFRESH_COOKIE, SESSION_COOKIE } from '@/infrastructure/bff/sessionCookie';

const ID_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';
const ctx = (...slug: string[]) => ({ params: Promise.resolve({ slug }) });
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });

function post(path: string, body?: unknown, cookies = '') {
  return new NextRequest(`http://localhost/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookies ? { cookie: cookies } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BFF /api/v1/auth (OWASP A04/A07)', () => {
  it('login: guarda los tokens en cookies HttpOnly y NO los devuelve en el JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({ access_token: 'acc', id_token: ID_TOKEN, refresh_token: 'ref', token_type: 'Bearer', expires_in: 3600 })
      )
    );
    vi.spyOn(console, 'info').mockImplementation(() => {});

    const res = await POST(post('login', { email: 'Ana@B.cl', password: 'secreto123' }), ctx('login'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ authenticated: true, expires_in: 3600 });
    expect(JSON.stringify(body)).not.toContain(ID_TOKEN);

    const session = res.cookies.get(SESSION_COOKIE);
    expect(session?.value).toBe(ID_TOKEN);
    expect(session?.httpOnly).toBe(true);
    expect(session?.path).toBe('/');
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('ref');
    expect(res.cookies.get(REFRESH_COOKIE)?.httpOnly).toBe(true);
  });

  it('login fallido: mismo mensaje para usuario inexistente o contraseña errónea (anti-enumeración)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'UserNotFoundException' }, 404)));
    const a = await POST(post('login', { email: 'nadie@b.cl', password: 'x' }), ctx('login'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'NotAuthorizedException: Incorrect password' }, 401)));
    const b = await POST(post('login', { email: 'ana@b.cl', password: 'x' }), ctx('login'));

    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
  });

  it('forgot-password responde igual exista o no la cuenta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'UserNotFoundException' }, 404)));
    const res = await POST(post('forgot-password', { email: 'nadie@b.cl' }), ctx('forgot-password'));
    expect(res.status).toBe(200);
  });

  it('valida el cuerpo con Zod (campos extra o formatos inválidos → 422 sin llamar al backend)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(post('login', { email: 'no-es-correo', password: 'x', role: 'admin' }), ctx('login'));
    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refresh usa el refresh token de la cookie (nunca del cuerpo) y rota la sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id_token: ID_TOKEN, expires_in: 3600 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(
      post('refresh', { email: 'ana@b.cl', refresh_token: 'inyectado' }, `${REFRESH_COOKIE}=desde-cookie`),
      ctx('refresh')
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).refresh_token).toBe('desde-cookie');
  });

  describe('logout con revocación real en Cognito (A07)', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('revoca el refresh token con RevokeToken y borra las cookies', async () => {
      vi.stubEnv('AWS_REGION', 'us-east-1');
      vi.stubEnv('COGNITO_CLIENT_ID', 'client123abc');
      vi.spyOn(console, 'info').mockImplementation(() => {});
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const res = await POST(post('logout', undefined, `${REFRESH_COOKIE}=rt-value-xyz`), ctx('logout'));

      expect(res.status).toBe(200);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://cognito-idp.us-east-1.amazonaws.com/');
      expect(new Headers(init.headers).get('x-amz-target')).toBe('AWSCognitoIdentityProviderService.RevokeToken');
      expect(new Headers(init.headers).get('content-type')).toBe('application/x-amz-json-1.1');
      expect(JSON.parse(init.body)).toEqual({ Token: 'rt-value-xyz', ClientId: 'client123abc' });
      expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
      expect(res.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
    });

    it('si Cognito falla, igual borra las cookies y responde 200', async () => {
      vi.stubEnv('AWS_REGION', 'us-east-1');
      vi.stubEnv('COGNITO_CLIENT_ID', 'client123abc');
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
      const res = await POST(post('logout', undefined, `${REFRESH_COOKIE}=rt-value-xyz`), ctx('logout'));
      expect(res.status).toBe(200);
      expect(res.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
    });

    it('nunca llama a un host derivado de una región manipulada (SSRF)', async () => {
      vi.stubEnv('AWS_REGION', 'evil.example/x?');
      vi.stubEnv('COGNITO_CLIENT_ID', 'client123abc');
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const res = await POST(post('logout', undefined, `${REFRESH_COOKIE}=rt-value-xyz`), ctx('logout'));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
    });
  });

  it('logout borra ambas cookies de sesión', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const res = await POST(post('logout'), ctx('logout'));
    expect(res.status).toBe(200);
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBe('');
    expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
    expect(res.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
  });

  it('reenvía el X-Request-ID a auth-service y lo incluye en los 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ detail: 'Error interno del servidor.' }, 500));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-auth-0001' },
      body: JSON.stringify({ email: 'a@b.cl', password: 'x' }),
    });
    const res = await POST(req, ctx('login'));
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-request-id')).toBe('req-auth-0001');
    expect(res.status).toBe(502);
    expect((await res.json()).request_id).toBe('req-auth-0001');
  });

  it.each([
    ['login', { email: 'a@b.cl', password: 'x' }],
    ['register', { name: 'Ana', email: 'a@b.cl', password: 'Segura#2026abc' }],
    ['forgot-password', { email: 'a@b.cl' }],
    ['confirm', { email: 'a@b.cl', confirmation_code: '123456' }],
  ])('propaga el 429 del backend en %s con Retry-After (no lo disfraza de 401/200)', async (action, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"detail":"Demasiados intentos. Inténtalo más tarde."}', { status: 429, headers: { 'retry-after': '37' } }))
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await POST(post(action, body), ctx(action));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('37');
    expect((await res.json()).detail).toBe('Demasiados intentos. Inténtalo más tarde.');
  });

  it('propaga el 429 en resend-code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'retry-after': '12' } })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const req = new NextRequest('http://localhost/api/v1/auth/resend-code?email=a%40b.cl', { method: 'POST' });
    const res = await POST(req, ctx('resend-code'));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('12');
  });

  it('solo expone las subrutas de la lista blanca', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const get = await GET(new NextRequest('http://localhost/api/v1/auth/admin/users'), ctx('admin', 'users'));
    const postRes = await POST(post('admin-create', {}), ctx('admin-create'));
    expect(get.status).toBe(404);
    expect(postRes.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
