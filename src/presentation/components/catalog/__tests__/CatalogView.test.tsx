import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VideoGame } from '@/domain/models';

const nav = { search: '', replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => '/catalogo',
}));

const query = {
  data: undefined as VideoGame[] | undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
vi.mock('@/application/hooks/useVideoGamesQuery', () => ({
  useVideoGamesQuery: () => query,
}));
vi.mock('@/presentation/hooks/useAddToCart', () => ({
  useAddToCart: () => vi.fn(),
}));
vi.mock('@/presentation/providers/BackdropFocusProvider', () => ({
  useBackdropFocus: () => ({ focus: null, setFocus: vi.fn() }),
}));

import { CatalogView } from '@/presentation/components/catalog/CatalogView';

const games: VideoGame[] = [
  { id: '1', title: 'Ruta Norte', price_clp: 1, stock: 1, platform: { id: 'a', name: 'PS5' }, genres: [{ id: 'x', name: 'Acción' }] },
  { id: '2', title: 'Faro', price_clp: 1, stock: 1, platform: { id: 'b', name: 'PC' }, genres: [{ id: 'y', name: 'RPG' }] },
  { id: '3', title: 'Marea', price_clp: 1, stock: 1, platform: { id: 'a', name: 'PS5' }, genres: [{ id: 'y', name: 'RPG' }] },
];

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
  query.data = games;
  query.isLoading = false;
  query.isError = false;
  query.refetch.mockReset();
});

describe('CatalogView', () => {
  it('la búsqueda conserva el espacio final mientras se escribe', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CatalogView />);
    const box = screen.getByRole('searchbox', { name: 'Buscar juegos' });
    await user.type(box, 'ruta ');
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/catalogo?q=ruta', { scroll: false }), { timeout: 2000 });
    nav.search = 'q=ruta'; // the URL now carries the trimmed query
    rerender(<CatalogView />);
    expect(box).toHaveValue('ruta ');
  });

  it('un refetch fallido no borra el catálogo que ya se ve', () => {
    query.isError = true;
    render(<CatalogView />);
    expect(screen.getByRole('link', { name: 'Faro' })).toBeInTheDocument();
  });

  it('los títulos de las cards cuelgan de un h2 "Resultados" (sin saltar niveles)', () => {
    render(<CatalogView />);
    expect(screen.getByRole('heading', { level: 2, name: 'Resultados' })).toBeInTheDocument();
  });

  it('marcar una plataforma escribe el filtro en la URL', async () => {
    render(<CatalogView />);
    const platforms = screen.getByRole('group', { name: 'Plataforma' });
    await userEvent.click(within(platforms).getByRole('checkbox', { name: /^PS5/ }));
    expect(nav.replace).toHaveBeenCalledWith('/catalogo?plataforma=PS5', { scroll: false });
  });

  it('lee los filtros desde la URL', () => {
    nav.search = 'genero=RPG';
    render(<CatalogView />);
    const genres = screen.getByRole('group', { name: 'Género' });
    expect(within(genres).getByRole('checkbox', { name: /^RPG/ })).toBeChecked();
    expect(screen.queryByRole('link', { name: 'Ruta Norte' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Faro' })).toBeInTheDocument();
  });

  it('sin resultados ofrece limpiar filtros', async () => {
    nav.search = 'plataforma=PC&genero=Acción';
    render(<CatalogView />);
    expect(screen.getByText('Ningún juego coincide con estos filtros')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(nav.replace).toHaveBeenCalledWith('/catalogo', { scroll: false });
  });

  it('backend caído: error con Reintentar', async () => {
    query.data = undefined;
    query.isError = true;
    render(<CatalogView />);
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Reintentar' }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it('cargando: grilla ocupada', () => {
    query.data = undefined;
    query.isLoading = true;
    const { container } = render(<CatalogView />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('la tecla / enfoca el buscador', async () => {
    render(<CatalogView />);
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Buscar juegos' })).toHaveFocus();
  });

  it('anuncia el número de resultados', () => {
    nav.search = 'plataforma=PS5';
    render(<CatalogView />);
    expect(screen.getByRole('status')).toHaveTextContent('2 juegos');
  });
});
