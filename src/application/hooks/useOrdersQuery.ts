import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import { getOrCreateGuestId } from '@/application/hooks/useCartQuery';
import type {
  OrderResponse,
  CreateOrderRequest,
  ProcessPaymentRequest,
  OrdersHealthResponse,
} from '@/domain/models';

export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  health: () => [...orderKeys.all, 'health'] as const,
};

/**
 * Hook para consultar el historial de órdenes del usuario actual (GET /api/v1/orders)
 */
export const useMyOrdersQuery = (enabled = true) => {
  return useQuery<OrderResponse[]>({
    queryKey: orderKeys.list(),
    queryFn: async () => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      return await fetchClient<OrderResponse[]>('/api/v1/orders', { headers });
    },
    enabled,
  });
};

/**
 * Hook para consultar el detalle de una orden específica (GET /api/v1/orders/{order_id})
 */
export const useOrderByIdQuery = (orderId?: string) => {
  return useQuery<OrderResponse>({
    queryKey: orderKeys.detail(orderId || ''),
    queryFn: async () => {
      if (!orderId) throw new Error('Se requiere un ID de orden válido');
      return await fetchClient<OrderResponse>(`/api/v1/orders/${orderId}`);
    },
    enabled: Boolean(orderId),
  });
};

/**
 * Hook para crear una nueva orden de compra (POST /api/v1/orders)
 */
export const useCreateOrderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, CreateOrderRequest>({
    mutationFn: async (payload: CreateOrderRequest) => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      const idempotencyKey = payload.idempotency_key || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
      headers['Idempotency-Key'] = idempotencyKey;

      return await fetchClient<OrderResponse>('/api/v1/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: payload.items,
          idempotency_key: idempotencyKey,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

/**
 * Hook para pagar una orden a través del flujo Saga & Outbox (POST /api/v1/orders/{order_id}/pay)
 */
export const usePayOrderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, { orderId: string; paymentId?: string }>({
    mutationFn: async ({ orderId, paymentId = `pay_${Date.now()}` }) => {
      const payload: ProcessPaymentRequest = { payment_id: paymentId };
      return await fetchClient<OrderResponse>(`/api/v1/orders/${encodeURIComponent(orderId)}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
};

/**
 * Hook para consultar el estado de salud del servicio de órdenes (GET /api/v1/orders/health)
 */
export const useOrdersHealthQuery = () => {
  return useQuery<OrdersHealthResponse>({
    queryKey: orderKeys.health(),
    queryFn: async () => {
      return await fetchClient<OrdersHealthResponse>('/api/v1/orders/health');
    },
  });
};

