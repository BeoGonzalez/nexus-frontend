import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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
vi.mock('@/application/hooks/useCartQuery', () => ({
  useAddToCartMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/presentation/components/catalog/RecommendationSection', () => ({
  RecommendationSection: () => null,
}));
const setFocus = vi.fn();
vi.mock('@/presentation/providers/BackdropFocusProvider', () => ({
  useBackdropFocus: () => ({ focus: null, setFocus }),
}));
vi.mock('@/presentation/providers/CartUIProvider', () => ({
  useCartUI: () => ({ flyToCart: vi.fn() }),
}));
vi.mock('@/presentation/components/shell/Announcer', () => ({
  useAnnounce: () => vi.fn(),
}));

import { HomeView } from '@/presentation/components/home/HomeView';

beforeEach(() => {
  query.data = undefined;
  query.isLoading = false;
  query.isError = false;
  query.refetch.mockReset();
  setFocus.mockReset();
});

describe('HomeView', () => {
  it('al hacer scroll, la luz del fondo pasa a la portada que cruza el centro', async () => {
    const observers: Array<(entries: Array<{ isIntersecting: boolean; target: Element }>) => void> = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void) { observers.push(cb); }
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    query.data = [
      { id: 'a', title: 'Ruta Norte', price_clp: 1, stock: 3, image_url: 'https://images.unsplash.com/a', created_at: '2025-01-01' },
      { id: 'b', title: 'Faro', price_clp: 1, stock: 3, image_url: 'https://images.unsplash.com/b' },
    ];
    const { container } = render(<HomeView />);
    const card = container.querySelector('[data-cover="https://images.unsplash.com/b"]');
    expect(card).not.toBeNull();
    setFocus.mockReset();
    act(() => observers.forEach((cb) => cb([{ isIntersecting: true, target: card! }])));
    await waitFor(() => expect(setFocus).toHaveBeenCalledWith('https://images.unsplash.com/b'));
    vi.unstubAllGlobals();
  });

  it('el estante solo muestra juegos con portada; el total sigue siendo el real', () => {
    query.data = [
      { id: 'a', title: 'Ruta Norte', price_clp: 1, stock: 3, image_url: 'https://images.unsplash.com/a', created_at: '2025-01-01' },
      { id: 'b', title: 'Faro', price_clp: 1, stock: 3, image_url: 'https://images.unsplash.com/b' },
      { id: 'c', title: 'Sin Portada', price_clp: 1, stock: 3 },
    ];
    render(<HomeView />);
    expect(screen.getByRole('link', { name: 'Faro' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sin Portada' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver los 3 juegos' })).toBeInTheDocument();
  });

  it('cada plataforma muestra un mosaico con portadas reales de esa plataforma', () => {
    query.data = [
      { id: 'a', title: 'Ruta Norte', price_clp: 1, stock: 3, platform: { id: 'p', name: 'PS5' }, image_url: 'https://images.unsplash.com/a' },
      { id: 'b', title: 'Faro', price_clp: 1, stock: 3, platform: { id: 'p', name: 'PS5' }, image_url: 'https://images.unsplash.com/b' },
    ];
    render(<HomeView />);
    const tile = screen.getByRole('link', { name: /PS5/ });
    expect(tile.querySelectorAll('[data-platform-cover]').length).toBe(2);
  });

  it('backend caído: muestra el error con Reintentar', async () => {
    query.isError = true;
    render(<HomeView />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it('cargando: región ocupada con skeletons', () => {
    query.isLoading = true;
    const { container } = render(<HomeView />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('catálogo vacío: invita a volver más tarde', () => {
    query.data = [];
    render(<HomeView />);
    expect(screen.getByText('Aún no hay juegos en el catálogo')).toBeInTheDocument();
  });

  it('con datos: el hero usa el juego real y tiñe el fondo con su portada', () => {
    query.data = [
      { id: 'a', title: 'Ruta Norte', price_clp: 49990, stock: 3, platform: { id: 'p', name: 'PS5' }, image_url: 'https://images.unsplash.com/x' },
      { id: 'b', title: 'Faro', price_clp: 19990, stock: 3, platform: { id: 'q', name: 'PC' } },
    ];
    render(<HomeView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ruta Norte' })).toBeInTheDocument();
    expect(setFocus).toHaveBeenCalledWith('https://images.unsplash.com/x');
    expect(screen.getByRole('link', { name: /PC/ })).toHaveAttribute('href', '/catalogo?plataforma=PC');
  });
});
