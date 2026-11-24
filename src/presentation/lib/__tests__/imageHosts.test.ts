import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * OWASP A10:2021 SSRF / A06 abuso de recursos: el optimizador de imágenes de Next solo debe descargar
 * imágenes de hosts EXACTOS de la tienda. Un comodín como *.s3.amazonaws.com convierte el servidor en un
 * proxy gratuito de las imágenes (y del ancho de banda) de cualquier bucket de cualquier cliente de AWS.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(env?: string) {
  if (env !== undefined) vi.stubEnv('NEXT_PUBLIC_IMAGE_HOSTS', env);
  vi.resetModules();
  return import('@/presentation/lib/imageHosts');
}

describe('hosts de imágenes optimizables', () => {
  it('por defecto solo Unsplash: un bucket S3 cualquiera NO se optimiza', async () => {
    const { optimizableHosts } = await load('');
    expect(optimizableHosts()).toEqual(['images.unsplash.com']);
    const { canOptimize } = await import('@/presentation/lib/cover');
    expect(canOptimize('https://atacante-bucket.s3.amazonaws.com/x.png')).toBe(false);
    expect(canOptimize('https://atacante.s3.us-east-1.amazonaws.com/x.png')).toBe(false);
  });

  it('acepta el bucket de assets configurado por nombre exacto', async () => {
    await load('nexus-assets.s3.us-east-1.amazonaws.com');
    const { canOptimize } = await import('@/presentation/lib/cover');
    expect(canOptimize('https://nexus-assets.s3.us-east-1.amazonaws.com/covers/hades.png')).toBe(true);
    expect(canOptimize('https://otro.s3.us-east-1.amazonaws.com/covers/hades.png')).toBe(false);
  });

  it('descarta comodines, esquemas y valores malformados en la variable', async () => {
    const { optimizableHosts } = await load('*.s3.amazonaws.com, https://x.com, ok.example.com, a b.com,');
    expect(optimizableHosts()).toEqual(['images.unsplash.com', 'ok.example.com']);
  });

  it('solo https: http nunca se optimiza', async () => {
    await load('ok.example.com');
    const { canOptimize } = await import('@/presentation/lib/cover');
    expect(canOptimize('http://ok.example.com/x.png')).toBe(false);
  });

  it('next.config no declara hostnames con comodín', async () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_HOSTS', 'nexus-assets.s3.us-east-1.amazonaws.com');
    vi.resetModules();
    const config = (await import('../../../../next.config')).default;
    const hosts = (config.images?.remotePatterns ?? []).map((p) => (p instanceof URL ? p.hostname : p.hostname));
    expect(hosts.length).toBeGreaterThan(0);
    for (const h of hosts) expect(h).not.toContain('*');
    expect(hosts).toContain('nexus-assets.s3.us-east-1.amazonaws.com');
  });

  it('una URL relativa al protocolo (//host) no se trata como ruta local', async () => {
    await load('');
    const { canOptimize } = await import('@/presentation/lib/cover');
    expect(canOptimize('//evil.example/x.png')).toBe(false);
    expect(canOptimize('/covers/hades.png')).toBe(true);
  });
});
