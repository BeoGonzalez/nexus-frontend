import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VideoGame } from '@/domain/models';

const query = {
  data: undefined as VideoGame[] | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
vi.mock('@/application/hooks/useVideoGamesQuery', () => ({
  useVideoGamesQuery: () => query,
}));
const mutate = vi.fn();
vi.mock('@/application/hooks/useCartQuery', () => ({
  useAddToCartMutation: () => ({ mutate }),
}));
vi.mock('@/presentation/providers/CartUIProvider', () => ({
  useCartUI: () => ({ flyToCart: vi.fn() }),
}));
const announce = vi.fn();
vi.mock('@/presentation/components/shell/Announcer', () => ({
  useAnnounce: () => announce,
}));
const setFocus = vi.fn();
vi.mock('@/presentation/providers/BackdropFocusProvider', () => ({
  useBackdropFocus: () => ({ focus: null, setFocus }),
}));
const viewerLoaded = vi.fn();
vi.mock('next/dynamic', () => ({
  default: () => {
    const Viewer = () => {
      viewerLoaded();
      return <div data-testid="viewer-3d" />;
    };
    return Viewer;
  },
}));

import { ProductDetail } from '@/presentation/components/product/ProductDetail';
import { formatCLP } from '@/presentation/lib/format';

const game: VideoGame = {
  id: 'g1',
  title: 'Ruta Norte',
  description: 'Una travesía por la costa.',
  price_clp: 49990,
  stock: 12,
  platform: { id: 'p', name: 'PS5' },
  genres: [{ id: 'a', name: 'Acción' }, { id: 'b', name: 'Aventura' }],
  image_url: 'https://images.unsplash.com/photo-1?w=800',
};

beforeEach(() => {
  query.data = [game];
  query.isLoading = false;
  query.isError = false;
  query.refetch.mockReset();
  mutate.mockReset();
  announce.mockReset();
  setFocus.mockReset();
  viewerLoaded.mockReset();
});

describe('ProductDetail', () => {
  it('al salir de la ficha el fondo vuelve al campo neutro', () => {
    const { unmount } = render(<ProductDetail id="g1" />);
    unmount();
    expect(setFocus).toHaveBeenLastCalledWith(null);
  });

  it('un refetch fallido no reemplaza la ficha que ya se ve', () => {
    query.isError = true;
    render(<ProductDetail id="g1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ruta Norte' })).toBeInTheDocument();
  });

  it('el error sin datos ofrece volver al catálogo', () => {
    query.data = undefined;
    query.isError = true;
    render(<ProductDetail id="g1" />);
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/catalogo');
  });

  it('muestra los datos reales del juego', () => {
    render(<ProductDetail id="g1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ruta Norte' })).toBeInTheDocument();
    expect(screen.getByText(formatCLP(49990))).toBeInTheDocument();
    expect(screen.getByText('Una travesía por la costa.')).toBeInTheDocument();
    expect(screen.getByText('Acción, Aventura')).toBeInTheDocument();
    expect(setFocus).toHaveBeenCalledWith('https://images.unsplash.com/photo-1?w=800');
  });

  it('añadir al carrito usa la misma mutación y lo anuncia', async () => {
    render(<ProductDetail id="g1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Añadir al carrito' }));
    expect(mutate).toHaveBeenCalledWith({ product_id: 'g1', quantity: 1 });
    expect(announce).toHaveBeenCalledWith('Ruta Norte añadido al carrito');
  });

  it('id inexistente: no encontrado con vuelta al catálogo', () => {
    render(<ProductDetail id="otro" />);
    expect(screen.getByText('No encontramos este juego')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/catalogo');
  });

  it('error del backend: Reintentar', async () => {
    query.data = undefined;
    query.isError = true;
    render(<ProductDetail id="g1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it('cargando: skeleton ocupado', () => {
    query.data = undefined;
    query.isLoading = true;
    const { container } = render(<ProductDetail id="g1" />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('sin portada: respaldo y fondo neutro', () => {
    query.data = [{ ...game, image_url: undefined }];
    render(<ProductDetail id="g1" />);
    expect(screen.getByTestId('cover-fallback')).toBeInTheDocument();
    expect(setFocus).toHaveBeenCalledWith(null);
  });

  it('sin stock deshabilita la compra', () => {
    query.data = [{ ...game, stock: 0 }];
    render(<ProductDetail id="g1" />);
    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
  });

  it('stock bajo muestra cuántos quedan', () => {
    query.data = [{ ...game, stock: 3 }];
    render(<ProductDetail id="g1" />);
    expect(screen.getByText('Quedan 3')).toBeInTheDocument();
  });

  it('el visor 3D solo se monta al pedirlo', async () => {
    render(<ProductDetail id="g1" />);
    expect(viewerLoaded).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ver en 3D' }));
    expect(screen.getByTestId('viewer-3d')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver portada' })).toBeInTheDocument();
  });
});
