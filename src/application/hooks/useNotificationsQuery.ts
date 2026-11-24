import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type {
  NotificationsHealthResponse,
  SendReceiptRequest,
  SendReceiptResponse,
} from '@/domain/models';

export const notificationKeys = {
  all: ['notifications'] as const,
  health: () => [...notificationKeys.all, 'health'] as const,
};

/**
 * Hook para consultar el estado de salud del Microservicio de Notificaciones.
 * Endpoint: GET /api/v1/notifications/health
 */
export const useNotificationsHealthQuery = (enabled = true) => {
  return useQuery<NotificationsHealthResponse>({
    queryKey: notificationKeys.health(),
    queryFn: async () => {
      return await fetchClient<NotificationsHealthResponse>('/api/v1/notifications/health');
    },
    enabled,
    staleTime: 1000 * 60, // 1 minuto
  });
};

/**
 * Hook para emitir y enviar la boleta electrónica y claves por correo.
 * Endpoint: POST /api/v1/notifications/send-receipt
 */
export const useSendReceiptMutation = () => {
  return useMutation<SendReceiptResponse, Error, SendReceiptRequest>({
    mutationFn: async (payload: SendReceiptRequest) => {
      return await fetchClient<SendReceiptResponse>('/api/v1/notifications/send-receipt', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
};


