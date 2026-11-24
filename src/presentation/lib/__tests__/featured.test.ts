import { describe, it, expect } from 'vitest';
import type { VideoGame } from '@/domain/models';
import { pickFeatured } from '@/presentation/lib/featured';
import { formatCLP } from '@/presentation/lib/format';

const g = (id: string, created_at?: string): VideoGame => ({ id, title: id, price_clp: 1, stock: 1, created_at });

describe('pickFeatured', () => {
  it('prefiere el más reciente que tiene portada', () => {
    const withCover = { ...g('viejo', '2024-01-01'), image_url: 'https://x/a.jpg' };
    expect(pickFeatured([withCover, g('nuevo-sin-portada', '2025-06-01')])?.id).toBe('viejo');
  });
  it('catálogo vacío no tiene destacado', () => {
    expect(pickFeatured([])).toBeNull();
  });
  it('elige el más reciente por created_at', () => {
    expect(pickFeatured([g('a', '2024-01-01'), g('b', '2025-06-01'), g('c')])?.id).toBe('b');
  });
  it('sin fechas usa el primero que devuelve la API', () => {
    expect(pickFeatured([g('a'), g('b')])?.id).toBe('a');
  });
});

describe('formatCLP', () => {
  it('formatea pesos chilenos sin decimales', () => {
    expect(formatCLP(49990).replace(/\s/g, ' ')).toMatch(/^\$ ?49\.990$/);
  });
});
