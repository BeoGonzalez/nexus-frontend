import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchClient } from '../fetchClient';

afterEach(() => vi.unstubAllGlobals());

describe('fetchClient', () => {
  it('un 429 produce ApiError con retryAfter en segundos (A07)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"detail":"Demasiados intentos. Inténtalo más tarde."}', { status: 429, headers: { 'retry-after': '25' } })
      )
    );
    const err = (await fetchClient('/api/v1/auth/login', { method: 'POST' }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(25);
    expect(err.message).toBe('Demasiados intentos. Inténtalo más tarde.');
  });

  it('sin Retry-After válido, retryAfter es null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"x"}', { status: 400 })));
    const err = (await fetchClient('/api/v1/cart').catch((e: unknown) => e)) as ApiError;
    expect(err.retryAfter).toBeNull();
  });

  it('rechaza endpoints absolutos o protocol-relative (solo /api del mismo origen)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchClient('https://evil.example/x')).rejects.toBeInstanceOf(ApiError);
    await expect(fetchClient('//evil.example/x')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
