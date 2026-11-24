import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/application/hooks/useRecommendationsQuery', () => ({
  useTrendingRecommendationsQuery: () => ({
    data: [
      { product_id: 'x1', title: 'Juego Fuera', score: 0.9, reason: 'Popular' },
      { product_id: 'g1', title: 'Ruta Norte', score: 0.8, reason: 'Similar' },
    ],
    isLoading: false,
    isError: false,
  }),
  useForYouRecommendationsQuery: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock('@/presentation/providers/SessionProvider', () => ({ useSession: () => ({ loggedIn: false, user: null, token: null, ready: true }) }));

import { RecommendationSection } from '@/presentation/components/catalog/RecommendationSection';

describe('RecommendationSection', () => {
  it('lo que no está en el catálogo no se puede comprar desde la recomendación', () => {
    render(
      <RecommendationSection
        catalog={[{ id: 'g1', title: 'Ruta Norte', price_clp: 49990, stock: 4, image_url: 'https://images.unsplash.com/a' }]}
        onAddToCart={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Añadir Ruta Norte al carrito' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Añadir Juego Fuera al carrito' })).toBeNull();
  });
});
