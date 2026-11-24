// Entorno jsdom (navegador): aunque la variable existiera en el proceso, el código cliente no la usa.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withGatewayKey } from '../gatewayKey';

afterEach(() => vi.unstubAllEnvs());

describe('withGatewayKey en el navegador (A01/A02)', () => {
  it('nunca añade x-api-key cuando corre en el navegador', () => {
    vi.stubEnv('API_GATEWAY_KEY', 'gw-secret-key');
    expect(typeof window).toBe('object');
    expect(withGatewayKey(new Headers()).get('x-api-key')).toBeNull();
  });

  it('la variable no lleva prefijo NEXT_PUBLIC_ (Next no la inyecta en el bundle)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/infrastructure/bff/gatewayKey.ts'), 'utf8');
    expect(src).toContain('process.env.API_GATEWAY_KEY');
    expect(src).not.toMatch(/NEXT_PUBLIC_API_GATEWAY/);
  });
});
