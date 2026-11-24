import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import { gameKeys } from '@/application/keys/gameKeys';
import type { VideoGame } from '@/domain/models';

/**
 * Lista del catálogo vía BFF (GET /api/v1/catalog/products).
 * Las escrituras del catálogo solo existen como Server Actions de admin (adminGames.ts).
 */
export const useVideoGamesQuery = () => {
  return useQuery({
    queryKey: gameKeys.lists(),
    queryFn: async () => {
      return await fetchClient<VideoGame[]>('/api/v1/catalog/products');
    },
  });
};
