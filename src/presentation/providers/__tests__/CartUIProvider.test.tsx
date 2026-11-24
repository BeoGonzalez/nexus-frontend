import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import { CartUIProvider, useCartUI } from '@/presentation/providers/CartUIProvider';

let api: ReturnType<typeof useCartUI> | null = null;
function Probe() {
  const ui = useCartUI();
  useEffect(() => {
    api = ui;
  });
  return <span data-testid="bump">{ui.bumpKey}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.querySelectorAll('.cart-flyer').forEach((n) => n.remove());
});

describe('CartUIProvider flyToCart', () => {
  it('si el navegador rechaza la animación, no deja el cuadro pegado y el contador igual reacciona', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const rect = { left: 0, top: 0, width: 40, height: 40, right: 40, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([rect] as unknown as DOMRectList);
    // Older Safari/Firefox throw on CSS linear() easing in the Web Animations API.
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: () => {
        throw new TypeError('Invalid easing');
      },
    });

    const { getByTestId } = render(
      <CartUIProvider>
        <Probe />
      </CartUIProvider>,
    );
    const target = document.createElement('button');
    const from = document.createElement('button');
    document.body.append(target, from);
    act(() => api!.registerCartTarget(target));
    act(() => api!.flyToCart(from, 'https://x/cover.jpg'));

    expect(document.querySelector('.cart-flyer')).toBeNull();
    expect(getByTestId('bump')).toHaveTextContent('1');
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  });
});
