import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../safeRedirect';

describe('safeRedirectPath (OWASP A01 open redirect / A05 XSS)', () => {
  it.each([
    'javascript:alert(document.cookie)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    '/%09/evil.com',
    ' javascript:alert(1)',
    'evil.com',
  ])('rechaza %j', (raw) => {
    const out = safeRedirectPath(raw);
    expect(out.startsWith('/')).toBe(true);
    expect(out.startsWith('//')).toBe(false);
    expect(new URL(out, 'https://nexus.cl').origin).toBe('https://nexus.cl');
  });

  it('acepta rutas relativas del mismo origen', () => {
    expect(safeRedirectPath('/pedidos/123?tab=1#x')).toBe('/pedidos/123?tab=1#x');
    expect(safeRedirectPath('/admin')).toBe('/admin');
  });

  it('mantiene el alias heredado "checkout" y usa fallback ante vacío', () => {
    expect(safeRedirectPath('checkout')).toBe('/?checkout=open');
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('', '/home')).toBe('/home');
  });
});
