import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type { PaymentMethod, CreatePaymentMethodPayload, OrderResponse } from '@/domain/models';

export const orderKeys = {
  paymentMethods: (userId: string) => ['paymentMethods', userId] as const,
  orders: (userId: string) => ['orders', userId] as const,
};

export const usePaymentMethodsQuery = (loggedIn: boolean) => {
  return useQuery({
    queryKey: orderKeys.paymentMethods('me'),
    queryFn: async () => {
      if (!loggedIn) return [];
      return await fetchClient<PaymentMethod[]>('/api/v1/orders/payment-methods');
    },
    enabled: loggedIn,
  });
};

export const useAddPaymentMethodMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentMethodPayload) => {
      return await fetchClient<PaymentMethod>('/api/v1/orders/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.paymentMethods('me') });
    },
  });
};

export const useCreateOrderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      items: Array<{ product_id?: string; video_game_id?: string; quantity: number }>;
      idempotency_key?: string;
      customer_email?: string;
    }) => {
      const idempotencyKey =
        data.idempotency_key ||
        (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
      const normalizedItems = data.items.map((item) => ({
        product_id: item.product_id || item.video_game_id || '',
        quantity: item.quantity,
      }));
      // La identidad (y el correo) los decide el backend desde el JWT; nunca cabeceras X-User-*.
      const headers: Record<string, string> = {
        'Idempotency-Key': idempotencyKey,
      };
      return await fetchClient<OrderResponse>('/api/v1/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: normalizedItems,
          idempotency_key: idempotencyKey,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.orders('me') });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const usePayOrderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, paymentId }: { orderId: string; paymentId?: string }) => {
      return await fetchClient<OrderResponse>(`/api/v1/orders/${encodeURIComponent(orderId)}/pay`, {
        method: 'POST',
        body: JSON.stringify({ payment_id: paymentId || `pay_${Date.now()}` }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.orders('me') });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
