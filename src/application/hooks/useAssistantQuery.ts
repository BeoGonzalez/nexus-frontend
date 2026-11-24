import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type { AssistantHealthResponse } from '@/domain/models';

export const assistantKeys = {
  all: ['assistant'] as const,
  health: () => [...assistantKeys.all, 'health'] as const,
};

/**
 * Hook para consultar el estado operativo del Microservicio de Asistente IA Conversacional (RAG / SSE).
 * Endpoint: GET /api/v1/assistant/health
 */
export const useAssistantHealthQuery = (enabled = true) => {
  return useQuery<AssistantHealthResponse>({
    queryKey: assistantKeys.health(),
    queryFn: async () => {
      return await fetchClient<AssistantHealthResponse>('/api/v1/assistant/health');
    },
    enabled,
    staleTime: 1000 * 60, // 1 minuto
  });
};

