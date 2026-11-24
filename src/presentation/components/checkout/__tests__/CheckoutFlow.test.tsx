import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CartResponse } from '@/domain/models';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const session = {
  user: { name: 'Ana Rojas', email: 'ana@example.com' } as null | { name?: string; email?: string },
  loggedIn: true,
  ready: true,
  logout: vi.fn(),
};
vi.mock('@/presentation/providers/SessionProvider', () => ({ useSession: () => session }));

const cart = { data: undefined as CartResponse | undefined, isLoading: false, isError: false, refetch: vi.fn() };
const clearCart = vi.fn();
vi.mock('@/application/hooks/useCartQuery', () => ({
  useCartQuery: () => cart,
  useClearCartMutation: () => ({ mutate: clearCart }),
}));

const paymentMethods = { data: [] as unknown[], isLoading: false };
const addPm = { mutateAsync: vi.fn(), isPending: false };
const createOrder = { mutateAsync: vi.fn(), isPending: false };
const payOrder = { mutateAsync: vi.fn(), isPending: false };
vi.mock('@/application/hooks/useOrderMutations', () => ({
  usePaymentMethodsQuery: () => paymentMethods,
  useAddPaymentMethodMutation: () => addPm,
  useCreateOrderMutation: () => createOrder,
  usePayOrderMutation: () => payOrder,
}));
const sendReceipt = { mutateAsync: vi.fn() };
vi.mock('@/application/hooks/useNotificationsQuery', () => ({ useSendReceiptMutation: () => sendReceipt }));

const announce = vi.fn();
vi.mock('@/presentation/components/shell/Announcer', () => ({ useAnnounce: () => announce }));

import { CheckoutFlow } from '@/presentation/components/checkout/CheckoutFlow';

const withItems: CartResponse = {
  user_id: 'u',
  total_amount_clp: 0,
  total_items_count: 0,
  items: [{ product_id: 'g1', title: 'Ruta Norte', unit_price_clp: 49990, quantity: 1, subtotal_clp: 49990, image_url: null }],
};

beforeEach(() => {
  router.replace.mockReset();
  router.push.mockReset();
  session.user = { name: 'Ana Rojas', email: 'ana@example.com' };
  session.loggedIn = true;
  session.ready = true;
  cart.data = withItems;
  cart.isLoading = false;
  cart.isError = false;
  paymentMethods.data = [];
  addPm.mutateAsync.mockReset().mockResolvedValue({ id: 'pm1' });
  createOrder.mutateAsync.mockReset().mockResolvedValue({ id: 'ord-1' });
  payOrder.mutateAsync.mockReset().mockResolvedValue({ id: 'ord-1' });
  sendReceipt.mutateAsync.mockReset().mockResolvedValue({});
  clearCart.mockReset();
  announce.mockReset();
});

async function goToPayment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continuar al pago' }));
  await user.type(screen.getByLabelText('Número de tarjeta de prueba'), '4242424242424242');
  await user.type(screen.getByLabelText('Vencimiento'), '12/28');
  await user.type(screen.getByLabelText('CVC'), '123');
}

describe('CheckoutFlow', () => {
  it('la boleta va al correo de tu cuenta: el campo no se edita y lo explica', () => {
    render(<CheckoutFlow />);
    const email = screen.getByLabelText('Correo para la boleta y las claves');
    expect(email).toHaveValue('ana@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByText('La boleta y las claves se envían al correo de tu cuenta.')).toBeInTheDocument();
  });

  it('si el envío de la boleta falla, el recibo lo dice en vez de darla por enviada', async () => {
    sendReceipt.mutateAsync.mockRejectedValue(new Error('El correo no coincide con tu cuenta'));
    const user = userEvent.setup();
    render(<CheckoutFlow />);
    await goToPayment(user);
    await user.click(screen.getByRole('button', { name: /Pagar/ }));
    await screen.findByText('¡Pago Simulado Exitoso!', {}, { timeout: 3000 });
    expect(screen.getByText(/No pudimos enviar la boleta/)).toBeInTheDocument();
    expect(screen.getByText(/El correo no coincide con tu cuenta/)).toBeInTheDocument();
    expect(screen.queryByText(/Boleta y claves enviadas a/)).toBeNull();
    expect(announce).not.toHaveBeenCalledWith(expect.stringMatching(/Boleta enviada/));
  });

  it('sin sesión redirige al login y vuelve a /checkout', async () => {
    session.loggedIn = false;
    session.user = null;
    render(<CheckoutFlow />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?redirect=%2Fcheckout'));
  });

  it('no redirige mientras la sesión no está lista', () => {
    session.loggedIn = false;
    session.ready = false;
    render(<CheckoutFlow />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('carrito vacío: nada que pagar con enlace al catálogo', () => {
    cart.data = { ...withItems, items: [] };
    render(<CheckoutFlow />);
    expect(screen.getByText('No hay nada que pagar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar catálogo' })).toHaveAttribute('href', '/catalogo');
  });

  it('indica el paso actual y precarga los datos del usuario', () => {
    render(<CheckoutFlow />);
    const steps = screen.getByRole('list', { name: 'Pasos del pago' });
    expect(within(steps).getByText('Datos').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Rojas');
    expect(screen.getByLabelText('Correo para la boleta y las claves')).toHaveValue('ana@example.com');
  });

  it('mientras procesa anuncia cada paso y deshabilita el botón', async () => {
    let finishOrder: (v: { id: string }) => void = () => {};
    createOrder.mutateAsync.mockReturnValue(new Promise((r) => (finishOrder = r)));
    const user = userEvent.setup();
    render(<CheckoutFlow />);
    await goToPayment(user);
    const pay = screen.getByRole('button', { name: /Pagar/ });
    await user.click(pay);

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('2/4'), { timeout: 3000 });
    expect(pay).toBeDisabled();
    expect(pay).toHaveAttribute('aria-busy', 'true');
    expect(createOrder.mutateAsync).toHaveBeenCalledWith({
      items: [{ product_id: 'g1', quantity: 1 }],
      customer_email: 'ana@example.com',
    });
    finishOrder({ id: 'ord-1' });
    await screen.findByText('¡Pago Simulado Exitoso!', {}, { timeout: 3000 });
  });

  it('pago exitoso: muestra la boleta y vacía el carrito', async () => {
    const user = userEvent.setup();
    render(<CheckoutFlow />);
    await goToPayment(user);
    await user.click(screen.getByRole('button', { name: /Pagar/ }));
    expect(await screen.findByText('¡Pago Simulado Exitoso!', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(addPm.mutateAsync).toHaveBeenCalledWith({ card_number: '4242424242424242', card_brand: 'Visa Sandbox', is_default: true });
    expect(payOrder.mutateAsync).toHaveBeenCalledWith({ orderId: 'ord-1', paymentId: expect.stringMatching(/^SIM-TXN-/) });
    expect(clearCart).toHaveBeenCalled();
    expect(screen.getByText('Recibo').closest('li')).toHaveAttribute('aria-current', 'step');
    // The pay button is gone: focus moves to the receipt instead of falling back to <body>.
    expect(screen.getByLabelText('Boleta del pago')).toHaveFocus();
  });

  it('si falla la orden, muestra el error y deja reintentar', async () => {
    createOrder.mutateAsync.mockRejectedValue(new Error('Stock insuficiente'));
    const user = userEvent.setup();
    render(<CheckoutFlow />);
    await goToPayment(user);
    await user.click(screen.getByRole('button', { name: /Pagar/ }));
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Stock insuficiente');
    expect(screen.getByRole('button', { name: /Pagar/ })).toBeEnabled();
  });
});
