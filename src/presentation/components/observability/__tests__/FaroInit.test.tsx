import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const initFaro = vi.fn(async () => undefined);
vi.mock('@/infrastructure/observability/faro', () => ({ initFaro }));

describe('FaroInit', () => {
  it('inicializa Faro una vez y no renderiza nada', async () => {
    const { FaroInit } = await import('@/presentation/components/observability/FaroInit');
    const { container } = render(<FaroInit />);
    expect(container.innerHTML).toBe('');
    expect(initFaro).toHaveBeenCalledTimes(1);
  });
});
