// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

describe('GET /api/health (liveness del contenedor y del ALB)', () => {
  it('responde 200 sin contactar microservicios ni exponer versión o entorno', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
