import { describe, it, expect } from 'vitest';
import { toCartLines, cartTotals } from '@/presentation/lib/cartLines';
import type { CartResponse } from '@/domain/models';

const response: CartResponse = {
  user_id: 'u1',
  total_amount_clp: 0,
  total_items_count: 0,
  items: [
    { product_id: 'g1', title: 'Ruta Norte', unit_price_clp: 49990, quantity: 2, subtotal_clp: 99980, image_url: null },
    { product_id: 'g2', title: 'Faro', unit_price_clp: 19990, quantity: 1, subtotal_clp: 19990, image_url: 'https://x/y.jpg' },
  ],
};

describe('toCartLines', () => {
  it('sin datos devuelve una lista vacía', () => {
    expect(toCartLines(undefined)).toEqual([]);
  });

  it('mapea las líneas igual que la tienda anterior', () => {
    const [a, b] = toCartLines(response);
    expect(a).toEqual({
      id: 'g1',
      cartId: 'g1',
      title: 'Ruta Norte',
      price_clp: 49990,
      quantity: 2,
      image_url: undefined,
      stock: 99,
    });
    expect(b.image_url).toBe('https://x/y.jpg');
  });
});

describe('cartTotals', () => {
  it('suma unidades y total en CLP', () => {
    expect(cartTotals(toCartLines(response))).toEqual({ count: 3, total: 49990 * 2 + 19990 });
  });

  it('carrito vacío suma cero', () => {
    expect(cartTotals([])).toEqual({ count: 0, total: 0 });
  });
});
