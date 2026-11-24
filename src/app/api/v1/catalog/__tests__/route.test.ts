// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as route from '../[...slug]/route';

describe('proxy de catálogo: solo lectura desde el navegador (A01)', () => {
  it('exporta solo GET (POST/PATCH/PUT/DELETE → 405 automático de Next)', () => {
    expect(typeof route.GET).toBe('function');
    for (const m of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect((route as Record<string, unknown>)[m], m).toBeUndefined();
    }
  });
});
