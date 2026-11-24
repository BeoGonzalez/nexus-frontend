import type { CartResponse, VideoGame } from "@/domain/models";

/** Same shape the former single-page store used for a cart row. */
export type CartLine = VideoGame & { cartId: string; quantity: number };

/** Cart response → rows, mapped exactly as the former store did (stock: 99 included). */
export function toCartLines(cartData: CartResponse | undefined): CartLine[] {
  if (!cartData?.items) return [];
  return cartData.items.map((item) => ({
    id: item.product_id,
    cartId: item.product_id,
    title: item.title,
    price_clp: item.unit_price_clp,
    quantity: item.quantity,
    image_url: item.image_url || undefined,
    stock: 99,
  }));
}

/** Units and CLP total, summed the same way as the former store. */
export function cartTotals(lines: CartLine[]): { count: number; total: number } {
  return {
    count: lines.reduce((sum, item) => sum + item.quantity, 0),
    total: lines.reduce((sum, item) => sum + (item.price_clp || 0) * item.quantity, 0),
  };
}
