import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import { getOrCreateGuestId } from '@/application/hooks/useCartQuery';
import type {
  RecommendationResponse,
  RecommendationsHealthResponse,
} from '@/domain/models';

export const recommendationKeys = {
  all: ['recommendations'] as const,
  trending: (limit?: number) => [...recommendationKeys.all, 'trending', limit] as const,
  forYou: (limit?: number) => [...recommendationKeys.all, 'for-you', limit] as const,
  health: () => [...recommendationKeys.all, 'health'] as const,
};

/**
 * Hook para consultar juegos en tendencia / más recomendados (GET /api/v1/recommendations/trending)
 */
export const useTrendingRecommendationsQuery = (limit: number = 6) => {
  return useQuery<RecommendationResponse[]>({
    queryKey: recommendationKeys.trending(limit),
    queryFn: async () => {
      return await fetchClient<RecommendationResponse[]>(
        `/api/v1/recommendations/trending?limit=${limit}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Hook para consultar recomendaciones personalizadas basadas en afinidad (GET /api/v1/recommendations/for-you)
 */
export const useForYouRecommendationsQuery = (limit: number = 6, enabled: boolean = true) => {
  return useQuery<RecommendationResponse[]>({
    queryKey: recommendationKeys.forYou(limit),
    queryFn: async () => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      return await fetchClient<RecommendationResponse[]>(
        `/api/v1/recommendations/for-you?limit=${limit}`,
        { headers }
      );
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

/**
 * Hook para consultar el estado de salud del Microservicio de Recomendaciones.
 * Endpoint: GET /api/v1/recommendations/health
 */
export const useRecommendationsHealthQuery = (enabled = true) => {
  return useQuery<RecommendationsHealthResponse>({
    queryKey: recommendationKeys.health(),
    queryFn: async () => {
      return await fetchClient<RecommendationsHealthResponse>(
        '/api/v1/recommendations/health'
      );
    },
    enabled,
    staleTime: 1000 * 60, // 1 minuto
  });
};

