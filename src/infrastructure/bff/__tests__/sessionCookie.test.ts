// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('../sessionCookie');
}

afterEach(() => vi.unstubAllEnvs());

describe('cookies de sesión (A04/A07)', () => {
  it('producción: prefijo __Host-, HttpOnly, Secure, Path=/ y sin Domain', async () => {
    const m = await load('production');
    expect(m.SESSION_COOKIE).toBe('__Host-nexus_session');
    expect(m.REFRESH_COOKIE).toBe('__Host-nexus_refresh');
    const opts = m.sessionCookieOptions(3600) as unknown as Record<string, unknown>;
    expect(opts).toMatchObject({ httpOnly: true, secure: true, path: '/', maxAge: 3600 });
    expect(opts).not.toHaveProperty('domain');
    expect(['lax', 'strict']).toContain(opts.sameSite);
  });

  it('desarrollo: sin prefijo (Safari no acepta Secure sobre http://localhost), pero HttpOnly', async () => {
    const m = await load('development');
    expect(m.SESSION_COOKIE).toBe('nexus_session');
    expect(m.sessionCookieOptions(60)).toMatchObject({ httpOnly: true, secure: false });
  });

  it('acota expires_in del backend a 1 min – 24 h', async () => {
    const m = await load('production');
    expect(m.clampMaxAge(5)).toBe(60);
    expect(m.clampMaxAge(10 ** 9)).toBe(86_400);
    expect(m.clampMaxAge('3600')).toBe(m.DEFAULT_SESSION_MAX_AGE);
  });
});
