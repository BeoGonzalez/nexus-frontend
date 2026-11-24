// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIp, createRateLimiter, rateLimit } from '../rateLimit';
import { withGatewayKey } from '../gatewayKey';
import { buildForwardHeaders } from '../forwardHeaders';

afterEach(() => vi.unstubAllEnvs());

describe('clientIp detrás del ALB (X-Forwarded-For en modo append)', () => {
  it('ignora la IP falsificada que el cliente pone al principio', () => {
    // El atacante envía "X-Forwarded-For: 1.2.3.4"; el ALB añade la IP real al final.
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('respeta TRUSTED_PROXY_HOPS si hay más proxies de confianza', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '2');
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7, 10.0.0.5' }))).toBe('203.0.113.7');
  });

  it('el rate limit bloquea al superar el límite', () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit('t:ip', 3, 60_000, now).allowed).toBe(true);
    expect(rateLimit('t:ip', 3, 60_000, now).allowed).toBe(false);
    expect(rateLimit('t:ip', 3, 60_000, now + 61_000).allowed).toBe(true);
  });
});

describe('API key de API Gateway', () => {
  it('se añade a las llamadas del BFF cuando API_GATEWAY_KEY está definida', () => {
    vi.stubEnv('API_GATEWAY_KEY', 'k-123');
    expect(withGatewayKey(new Headers()).get('x-api-key')).toBe('k-123');
    const h = buildForwardHeaders({ headers: new Headers(), cookies: { get: () => undefined } });
    expect(h.get('x-api-key')).toBe('k-123');
  });

  it('no añade nada si no está definida (desarrollo local)', () => {
    vi.stubEnv('API_GATEWAY_KEY', '');
    expect(withGatewayKey(new Headers()).get('x-api-key')).toBeNull();
  });
});

describe('rate limiter resistente a inundación de claves (A07)', () => {
  it('una clave bloqueada sigue bloqueada tras inundar el mapa con IPs rotadas', () => {
    const limiter = createRateLimiter(100);
    const now = 5_000_000;
    for (let i = 0; i < 3; i++) limiter.hit('login:victim', 3, 60_000, now);
    expect(limiter.hit('login:victim', 3, 60_000, now).allowed).toBe(false);

    // El atacante rota IPv6: 1000 claves nuevas, 10 veces la capacidad.
    for (let i = 0; i < 1000; i++) limiter.hit(`login:2001:db8::${i.toString(16)}`, 3, 60_000, now + 1);

    expect(limiter.hit('login:victim', 3, 60_000, now + 2).allowed).toBe(false);
    expect(limiter.size()).toBeLessThanOrEqual(100);
  });

  it('expulsa primero las claves con la ventana ya vencida', () => {
    const limiter = createRateLimiter(10);
    for (let i = 0; i < 10; i++) limiter.hit(`old:${i}`, 5, 1_000, 0);
    limiter.hit('fresh', 5, 1_000, 10_000);
    expect(limiter.size()).toBeLessThanOrEqual(10);
    expect(limiter.has('fresh')).toBe(true);
  });
});
