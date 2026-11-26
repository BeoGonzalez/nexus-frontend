import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerOTel = vi.fn();
const pyroscopeInit = vi.fn();
const pyroscopeStart = vi.fn();
vi.mock('@vercel/otel', () => ({ registerOTel }));
vi.mock('@pyroscope/nodejs', () => ({ default: { init: pyroscopeInit, start: pyroscopeStart } }));

describe('instrumentation.ts (servidor Next.js)', () => {
  beforeEach(() => {
    vi.resetModules();
    registerOTel.mockClear();
    pyroscopeInit.mockClear();
    pyroscopeStart.mockClear();
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('sin colector configurado no instrumenta nada', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', '');
    vi.stubEnv('PYROSCOPE_SERVER_ADDRESS', '');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).not.toHaveBeenCalled();
    expect(pyroscopeInit).not.toHaveBeenCalled();
  });

  it('con OTLP registra las trazas del BFF con el nombre del servicio', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://10.0.11.50:4318');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).toHaveBeenCalledWith(expect.objectContaining({ serviceName: 'nexus-frontend' }));
  });

  it('con Pyroscope envía perfiles a la collector sin credenciales', async () => {
    vi.stubEnv('PYROSCOPE_SERVER_ADDRESS', 'http://10.0.11.50:4040');
    const { register } = await import('@/instrumentation');
    await register();
    expect(pyroscopeInit).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'nexus-frontend', serverAddress: 'http://10.0.11.50:4040' })
    );
    expect(JSON.stringify(pyroscopeInit.mock.calls[0][0])).not.toMatch(/token|password|basicAuth/i);
    expect(pyroscopeStart).toHaveBeenCalled();
  });

  it('en el runtime edge no hace nada', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://10.0.11.50:4318');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).not.toHaveBeenCalled();
  });

  it('un fallo del profiler nunca impide arrancar', async () => {
    vi.stubEnv('PYROSCOPE_SERVER_ADDRESS', 'http://10.0.11.50:4040');
    pyroscopeInit.mockImplementationOnce(() => {
      throw new Error('binario nativo no disponible');
    });
    const { register } = await import('@/instrumentation');
    await expect(register()).resolves.toBeUndefined();
  });
});
