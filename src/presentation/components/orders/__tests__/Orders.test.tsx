import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrderResponse } from '@/domain/models';

const session = { user: { name: 'Ana' }, loggedIn: true, ready: true, logout: vi.fn() };
vi.mock('@/presentation/providers/SessionProvider', () => ({ useSession: () => session }));

const list = { data: undefined as OrderResponse[] | undefined, isLoading: false, isError: false, refetch: vi.fn() };
const detail = { data: undefined as OrderResponse | undefined, isLoading: false, isError: false, refetch: vi.fn() };
const listEnabled = vi.fn();
vi.mock('@/application/hooks/useOrdersQuery', () => ({
  useMyOrdersQuery: (enabled?: boolean) => {
    listEnabled(enabled);
    return list;
  },
  useOrderByIdQuery: () => detail,
}));

import { OrdersList } from '@/presentation/components/orders/OrdersList';
import { OrderDetail } from '@/presentation/components/orders/OrderDetail';
import { formatCLP, formatDate } from '@/presentation/lib/format';

const paid: OrderResponse = {
  id: '7f3c2a10-aaaa-bbbb-cccc-1234567890ab',
  user_id: 'u',
  user_email: 'ana@example.com',
  status: 'PAID',
  total_amount_clp: 69980,
  created_at: '2026-11-20T15:30:00.000Z',
  items: [
    { product_id: 'g1', quantity: 1, unit_price_clp: 49990, subtotal_clp: 49990, product_title: 'Ruta Norte' },
    { product_id: 'g2', quantity: 1, unit_price_clp: 19990, subtotal_clp: 19990, product_title: null },
  ],
};
const cancelled: OrderResponse = { ...paid, id: 'c0ffee00-1111', status: 'CANCELLED', total_amount_clp: 19990, created_at: '2026-11-01T10:00:00.000Z' };

beforeEach(() => {
  session.loggedIn = true;
  session.ready = true;
  list.data = [cancelled, paid];
  list.isLoading = false;
  list.isError = false;
  list.refetch.mockReset();
  detail.data = paid;
  detail.isLoading = false;
  detail.isError = false;
  detail.refetch.mockReset();
  listEnabled.mockReset();
});

describe('OrdersList', () => {
  it('muestra fecha, total y estado de cada pedido, el más reciente primero', () => {
    render(<OrdersList />);
    const links = screen.getAllByRole('link', { name: /Pedido/ });
    expect(links[0]).toHaveAttribute('href', `/pedidos/${paid.id}`);
    expect(links[1]).toHaveAttribute('href', `/pedidos/${cancelled.id}`);
    const first = links[0];
    expect(within(first).getByText(formatDate(paid.created_at))).toBeInTheDocument();
    expect(within(first).getByText(formatCLP(69980))).toBeInTheDocument();
    expect(within(first).getByText('Pagado')).toBeInTheDocument();
    expect(within(links[1]).getByText('Cancelado')).toBeInTheDocument();
  });

  it('vacío: todavía no hay pedidos, con enlace al catálogo', () => {
    list.data = [];
    render(<OrdersList />);
    expect(screen.getByText('Todavía no tienes pedidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar catálogo' })).toHaveAttribute('href', '/catalogo');
  });

  it('error: Reintentar', async () => {
    list.data = undefined;
    list.isError = true;
    render(<OrdersList />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(list.refetch).toHaveBeenCalled();
  });

  it('cargando: lista ocupada', () => {
    list.data = undefined;
    list.isLoading = true;
    const { container } = render(<OrdersList />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('sin sesión: invita a ingresar y no consulta pedidos', () => {
    session.loggedIn = false;
    render(<OrdersList />);
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login?redirect=%2Fpedidos');
    expect(listEnabled).toHaveBeenLastCalledWith(false);
  });
});

describe('OrderDetail', () => {
  it('muestra estado, líneas y total reales', () => {
    render(<OrderDetail id={paid.id} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('7f3c2a10');
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('Ruta Norte')).toBeInTheDocument();
    // Sin título del servicio: se muestra el id del producto, sin inventar un nombre.
    expect(screen.getByText('g2')).toBeInTheDocument();
    expect(screen.getAllByText(formatCLP(69980)).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Pedidos/ })).toHaveAttribute('href', '/pedidos');
  });

  it('error o inexistente: mensaje y vuelta a pedidos', async () => {
    detail.data = undefined;
    detail.isError = true;
    render(<OrderDetail id="nope" />);
    expect(screen.getByText('No pudimos abrir este pedido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a pedidos' })).toHaveAttribute('href', '/pedidos');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(detail.refetch).toHaveBeenCalled();
  });
});
