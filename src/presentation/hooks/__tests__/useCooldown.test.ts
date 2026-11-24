import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { retryAfterOf, useCooldown } from '../useCooldown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCooldown', () => {
  it('cuenta atrás y se desactiva al llegar a 0', () => {
    const { result } = renderHook(() => useCooldown());
    expect(result.current.active).toBe(false);
    act(() => result.current.start(3));
    expect(result.current.active).toBe(true);
    expect(result.current.remaining).toBe(3);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remaining).toBe(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.active).toBe(false);
    expect(result.current.remaining).toBe(0);
  });
});

describe('retryAfterOf', () => {
  it('extrae los segundos de un error 429', () => {
    expect(retryAfterOf({ status: 429, retryAfter: 30 })).toBe(30);
    expect(retryAfterOf({ status: 429, retryAfter: null })).toBe(60);
    expect(retryAfterOf({ status: 400, retryAfter: 30 })).toBeNull();
    expect(retryAfterOf(new Error('x'))).toBeNull();
  });
});
