import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VideoGame } from '@/domain/models';
import { GameCard } from '@/presentation/components/catalog/GameCard';
import { formatCLP } from '@/presentation/lib/format';

const base: VideoGame = {
  id: 'g1',
  title: 'Ruta Norte',
  price_clp: 49990,
  stock: 8,
  platform: { id: 'p', name: 'PS5' },
  image_url: 'https://images.unsplash.com/photo-1?w=800',
};

describe('GameCard', () => {
  it('muestra título, plataforma y precio real', () => {
    render(<GameCard game={base} onAdd={vi.fn()} />);
    expect(screen.getByText('PS5')).toBeInTheDocument();
    expect(screen.getByText(formatCLP(49990))).toBeInTheDocument();
  });

  it('el enlace lleva a la ficha y se llama como el juego', () => {
    render(<GameCard game={base} onAdd={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Ruta Norte' })).toHaveAttribute('href', '/juego/g1');
  });

  it('añadir llama a onAdd con el juego y el elemento de origen', async () => {
    const onAdd = vi.fn();
    render(<GameCard game={base} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Añadir Ruta Norte al carrito' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toBe(base);
    expect(onAdd.mock.calls[0][1]).toBeInstanceOf(HTMLElement);
  });

  it('sin imagen muestra el respaldo y ninguna <img>', () => {
    const { container } = render(<GameCard game={{ ...base, image_url: undefined }} onAdd={vi.fn()} />);
    expect(screen.getByTestId('cover-fallback')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('títulos largos se recortan sin desbordar', () => {
    render(<GameCard game={{ ...base, title: 'Horizon Forbidden West (Collector CI - 1763700000000)' }} onAdd={vi.fn()} />);
    const title = screen.getByRole('link', { name: /Horizon Forbidden West/ });
    expect(title.className).toMatch(/line-clamp-2/);
    expect(title.closest('[data-card-body]')?.className).toMatch(/min-w-0/);
  });

  it('sin stock deshabilita la compra', () => {
    render(<GameCard game={{ ...base, stock: 0 }} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
  });

  it('sin plataforma no inventa una', () => {
    render(<GameCard game={{ ...base, platform: undefined }} onAdd={vi.fn()} />);
    expect(screen.queryByText('PS5')).toBeNull();
  });

  it('una recomendación fuera del catálogo no enlaza a una ficha inexistente', () => {
    render(<GameCard game={base} onAdd={vi.fn()} linkable={false} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ruta Norte' })).toBeInTheDocument();
  });
});
