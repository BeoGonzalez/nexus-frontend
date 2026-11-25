// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { buildCsp, proxy } from '@/proxy';

/** Next codifica las cabeceras de petición sobrescritas como `x-middleware-request-<nombre>`. */
const forwarded = (res: Response, name: string) => res.headers.get(`x-middleware-request-${name}`);

describe('proxy: X-Request-ID (A09)', () => {
  it('genera un id, lo reenvía al handler y lo devuelve al navegador', async () => {
    const res = await proxy(new NextRequest('http://localhost/api/v1/cart'));
    const id = res.headers.get('x-request-id');
    expect(id).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
    expect(forwarded(res, 'x-request-id')).toBe(id);
  });

  it('conserva un id entrante válido', async () => {
    const res = await proxy(new NextRequest('http://localhost/login', { headers: { 'x-request-id': 'req-abcdef12' } }));
    expect(res.headers.get('x-request-id')).toBe('req-abcdef12');
    expect(forwarded(res, 'x-request-id')).toBe('req-abcdef12');
  });

  it('sustituye un id malicioso', async () => {
    const res = await proxy(new NextRequest('http://localhost/api/v1/cart', { headers: { 'x-request-id': '<script>x</script>' } }));
    expect(res.headers.get('x-request-id')).not.toContain('<');
    expect(res.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  });

  it('las respuestas bloqueadas (CSRF) también llevan el id', async () => {
    const res = await proxy(
      new NextRequest('http://localhost/api/v1/auth/logout', { method: 'POST', headers: { origin: 'https://evil.example' } })
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  });
});

describe('proxy: verificación de Origin (A01/A06 CSRF)', () => {
  const post = (headers: Record<string, string>) =>
    proxy(new NextRequest('http://shop.example/api/v1/auth/logout', { method: 'POST', headers }));

  it('X-Forwarded-Host (controlable por el cliente) no convierte en propio un origen ajeno', async () => {
    const res = await post({ origin: 'https://evil.example', 'x-forwarded-host': 'evil.example', host: 'shop.example' });
    expect(res.status).toBe(403);
  });

  it('acepta el origen que coincide con el Host de la petición', async () => {
    const res = await post({ origin: 'http://shop.example', host: 'shop.example' });
    expect(res.status).not.toBe(403);
  });

  it('acepta el origen canónico configurado en SITE_URL', async () => {
    process.env.SITE_URL = 'https://tienda.example';
    try {
      const res = await post({ origin: 'https://tienda.example', host: 'internal-alb.example' });
      expect(res.status).not.toBe(403);
    } finally {
      delete process.env.SITE_URL;
    }
  });
});

describe('proxy: Content-Security-Policy (A02/A05)', () => {
  it('producción: sin unsafe-eval, con nonce y strict-dynamic', () => {
    const csp = buildCsp('bm9uY2U=', false);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("'nonce-bm9uY2U='");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('desarrollo: unsafe-eval solo para el depurador de React', () => {
    expect(buildCsp('bm9uY2U=', true)).toContain("'unsafe-eval'");
  });

  it('las páginas reciben la CSP con un nonce por petición', async () => {
    const a = (await proxy(new NextRequest('http://localhost/login'))).headers.get('content-security-policy')!;
    const b = (await proxy(new NextRequest('http://localhost/login'))).headers.get('content-security-policy')!;
    expect(a).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(a).not.toBe(b);
  });
});

describe('proxy: CSP y Grafana Faro', () => {
  it('permite enviar a Faro solo a su origen exacto', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', 'https://faro-collector-prod-us-east-0.grafana.net/collect/abc');
    const connect = buildCsp('bm9uY2U=', false).split('; ').find((d) => d.startsWith('connect-src'))!;
    expect(connect).toContain('https://faro-collector-prod-us-east-0.grafana.net');
    expect(connect).not.toContain('/collect/abc');
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', 'http://inseguro.example/collect/x');
    expect(buildCsp('bm9uY2U=', false)).not.toContain('inseguro.example');
    vi.unstubAllEnvs();
  });
});
