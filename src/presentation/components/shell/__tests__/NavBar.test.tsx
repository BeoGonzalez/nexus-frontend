import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pathname = { current: '/catalogo' };
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const cart = {
  data: {
    items: [
      { product_id: 'a', title: 'A', unit_price_clp: 1, quantity: 2, subtotal_clp: 2 },
      { product_id: 'b', title: 'B', unit_price_clp: 1, quantity: 1, subtotal_clp: 1 },
    ],
  },
};
vi.mock('@/application/hooks/useCartQuery', () => ({
  useCartQuery: () => cart,
}));

const session = { user: null as null | { name: string }, token: null, loggedIn: false, logout: vi.fn() };
vi.mock('@/presentation/providers/SessionProvider', () => ({
  useSession: () => session,
}));

const cartUI = { open: false, setOpen: vi.fn(), registerCartTarget: vi.fn(), flyToCart: vi.fn(), bumpKey: 0 };
vi.mock('@/presentation/providers/CartUIProvider', () => ({
  useCartUI: () => cartUI,
}));

import { NavBar } from '@/presentation/components/shell/NavBar';

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  session.user = null;
  session.loggedIn = false;
});

describe('NavBar', () => {
  it('enlaza Catálogo y Pedidos', () => {
    render(<NavBar />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(within(nav).getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/pedidos');
  });

  it('el botón del carrito anuncia la cantidad real y abre el carrito', async () => {
    render(<NavBar />);
    const btn = screen.getByRole('button', { name: 'Carrito, 3 productos' });
    await userEvent.click(btn);
    expect(cartUI.setOpen).toHaveBeenCalledWith(true);
  });

  it('sin sesión ofrece Ingresar con redirect a la ruta actual', () => {
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login?redirect=%2Fcatalogo');
  });

  it('con sesión muestra el menú de usuario con Cerrar sesión', async () => {
    session.user = { name: 'Ana' };
    session.loggedIn = true;
    const user = userEvent.setup();
    render(<NavBar />);
    await user.click(screen.getByRole('button', { name: /Cuenta de Ana/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(session.logout).toHaveBeenCalled();
  });

  it('incluye el selector de tema', () => {
    render(<NavBar />);
    expect(screen.getAllByRole('radiogroup', { name: 'Tema' }).length).toBeGreaterThan(0);
  });
});
