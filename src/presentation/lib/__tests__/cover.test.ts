import { describe, it, expect } from 'vitest';
import { getCoverSrc } from '@/presentation/lib/cover';

describe('getCoverSrc', () => {
  it('sin imagen devuelve null', () => {
    expect(getCoverSrc({})).toBeNull();
    expect(getCoverSrc({ image_url: '', image: '' })).toBeNull();
  });
  it('usa image cuando no hay image_url', () => {
    expect(getCoverSrc({ image: 'b' })).toBe('b');
  });
  it('prefiere image_url', () => {
    expect(getCoverSrc({ image_url: 'a', image: 'b' })).toBe('a');
  });
});
