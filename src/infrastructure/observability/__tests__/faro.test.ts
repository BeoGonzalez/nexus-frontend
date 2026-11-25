import { afterEach, describe, expect, it, vi } from 'vitest';
import { faroConfig, scrubUrl } from '@/infrastructure/observability/faro';

describe('Grafana Faro (observabilidad del navegador)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('sin NEXT_PUBLIC_FARO_URL no se activa', () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', '');
    expect(faroConfig()).toBeNull();
  });

  it('acepta solo URLs https y expone su origen para la CSP', () => {
    vi.stubEnv('NEXT_PUBLIC_FARO_URL', 'https://faro-collector-prod-us-east-0.grafana.net/collect/abc123');
    expect(faroConfig()).toEqual({
      url: 'https://faro-collector-prod-us-east-0.grafana.net/collect/abc123',
      origin: 'https://faro-collector-prod-us-east-0.grafana.net',
    });
  });

  it.each(['http://faro.example/collect/x', 'javascript:alert(1)', 'no-es-url', 'https://user:pw@faro.example/c'])(
    'rechaza %s',
    (url) => {
      vi.stubEnv('NEXT_PUBLIC_FARO_URL', url);
      expect(faroConfig()).toBeNull();
    }
  );

  it('quita query y fragmento de las URLs (tokens, emails, códigos de recuperación)', () => {
    expect(scrubUrl('https://tienda/recuperar?email=ana@x.cl&code=123456#paso2')).toBe('https://tienda/recuperar');
    expect(scrubUrl('/catalogo?q=hades')).toBe('/catalogo');
    expect(scrubUrl('no es url ?a=1')).toBe('no es url ');
  });
});
