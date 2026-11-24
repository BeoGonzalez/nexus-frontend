import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef } from 'react';
import type { CartResponse } from '@/domain/models';

const cart = {
  data: undefined as CartResponse | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
const mutate = vi.fn();
const pending = { value: false };
vi.mock('@/application/hooks/useCartQuery', () => ({
  useCartQuery: () => cart,
  useUpdateCartItemMutation: () => ({ mutate, isPending: pending.value }),
}));

import { CartUIProvider, useCartUI } from '@/presentation/providers/CartUIProvider';
import { CartDrawer } from '@/presentation/components/cart/CartDrawer';
import { formatCLP } from '@/presentation/lib/format';

function Opener() {
  const { setOpen, registerCartTarget } = useCartUI();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => registerCartTarget(ref.current), [registerCartTarget]);
  return (
    <button ref={ref} type="button" onClick={() => setOpen(true)}>
      Abrir carrito
    </button>
  );
}

function setup() {
  render(
    <CartUIProvider>
      <Opener />
      <CartDrawer />
    </CartUIProvider>,
  );
  return userEvent.setup();
}

const twoItems: CartResponse = {
  user_id: 'u',
  total_amount_clp: 0,
  total_items_count: 0,
  items: [
    { product_id: 'g1', title: 'Ruta Norte', unit_price_clp: 49990, quantity: 2, subtotal_clp: 99980, image_url: null },
    { product_id: 'g2', title: 'Faro', unit_price_clp: 19990, quantity: 1, subtotal_clp: 19990, image_url: null },
  ],
};

beforeEach(() => {
  cart.data = twoItems;
  cart.isLoading = false;
  cart.isError = false;
  cart.refetch.mockReset();
  mutate.mockReset();
  pending.value = false;
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('CartDrawer', () => {
  it('mientras actualiza, los botones siguen enfocables (aria-disabled) y no repiten la mutación', async () => {
    pending.value = true;
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    const plus = await screen.findByRole('button', { name: 'Añadir una unidad de Ruta Norte' });
    expect(plus).not.toBeDisabled();
    expect(plus).toHaveAttribute('aria-disabled', 'true');
    await user.click(plus);
    expect(mutate).not.toHaveBeenCalled();
    pending.value = false;
  });

  it('es un diálogo llamado Carrito con las líneas y el total reales', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    const dialog = await screen.findByRole('dialog', { name: 'Carrito' });
    expect(within(dialog).getByText('Ruta Norte')).toBeInTheDocument();
    expect(within(dialog).getByText('Faro')).toBeInTheDocument();
    expect(within(dialog).getByText(formatCLP(49990 * 2 + 19990))).toBeInTheDocument();
  });

  it('Esc lo cierra y devuelve el foco al botón del carrito', async () => {
    const user = setup();
    const opener = screen.getByRole('button', { name: 'Abrir carrito' });
    await user.click(opener);
    await screen.findByRole('dialog', { name: 'Carrito' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('"+" sube la cantidad con la misma mutación', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    await user.click(await screen.findByRole('button', { name: 'Añadir una unidad de Ruta Norte' }));
    expect(mutate).toHaveBeenCalledWith({ productId: 'g1', quantity: 3 });
  });

  it('"−" baja la cantidad', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    await user.click(await screen.findByRole('button', { name: 'Quitar una unidad de Ruta Norte' }));
    expect(mutate).toHaveBeenCalledWith({ productId: 'g1', quantity: 1 });
  });

  it('"Quitar <título>" elimina la línea con cantidad 0', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    await user.click(await screen.findByRole('button', { name: 'Quitar Faro' }));
    expect(mutate).toHaveBeenCalledWith({ productId: 'g2', quantity: 0 });
  });

  it('"Ir a pagar" enlaza a /checkout', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    expect(await screen.findByRole('link', { name: /Ir a pagar/ })).toHaveAttribute('href', '/checkout');
  });

  it('vacío: mensaje y enlace al catálogo', async () => {
    cart.data = { ...twoItems, items: [] };
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(screen.queryByRole('link', { name: /Ir a pagar/ })).not.toBeInTheDocument();
  });

  it('error al cargar: Reintentar', async () => {
    cart.data = undefined;
    cart.isError = true;
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir carrito' }));
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(cart.refetch).toHaveBeenCalled();
  });
});
