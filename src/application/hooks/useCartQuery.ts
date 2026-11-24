import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type {
  CartResponse,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartHealthResponse,
} from '@/domain/models';

export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'current'] as const,
  health: () => [...cartKeys.all, 'health'] as const,
};

/**
 * Genera o recupera el identificador opaco de invitado (carrito anónimo).
 * No es una credencial de usuario: el backend lo aísla como "guest:<uuid>". Se replica en una
 * cookie (Secure en HTTPS, SameSite=Lax) para que el BFF lo reenvíe como X-Guest-Id.
 */
const GUEST_ID_RE = /^guest-[0-9a-f-]{36}$/i;

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Contextos no seguros (http en LAN): UUID v4 con CSPRNG, nunca Math.random.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return 'guest-ssr';
  let guestId = localStorage.getItem('nexus_guest_id');
  if (!guestId || !GUEST_ID_RE.test(guestId)) {
    guestId = `guest-${randomUuid()}`;
    localStorage.setItem('nexus_guest_id', guestId);
  }
  if (!document.cookie.split('; ').some((c) => c === `nexus_guest_id=${guestId}`)) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `nexus_guest_id=${guestId}; path=/; max-age=2592000; SameSite=Lax${secure}`;
  }
  return guestId;
}

/**
 * Hook para obtener el carrito actual del usuario desde Redis a través del BFF (GET /api/v1/cart)
 */
export const useCartQuery = (enabled = true) => {
  return useQuery<CartResponse>({
    queryKey: cartKeys.detail(),
    queryFn: async () => {
      // Aseguramos que exista una sesión de usuario o invitado
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      return await fetchClient<CartResponse>('/api/v1/cart', { headers });
    },
    enabled,
    staleTime: 1000 * 15, // 15 segundos de frescura
  });
};

/**
 * Hook para añadir un producto al carrito (POST /api/v1/cart/items)
 */
export const useAddToCartMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CartResponse, Error, AddToCartRequest>({
    mutationFn: async (payload: AddToCartRequest) => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      return await fetchClient<CartResponse>('/api/v1/cart/items', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

/**
 * Hook para actualizar la cantidad de un ítem en el carrito (PUT /api/v1/cart/items/{product_id})
 */
export const useUpdateCartItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CartResponse, Error, { productId: string; quantity: number }>({
    mutationFn: async ({ productId, quantity }) => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      return await fetchClient<CartResponse>(`/api/v1/cart/items/${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ quantity } as UpdateCartItemRequest),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.detail(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

/**
 * Hook para vaciar por completo el carrito (DELETE /api/v1/cart)
 */
export const useClearCartMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      // Asegura la cookie de invitado; la sesión (si existe) viaja en la cookie HttpOnly.
      getOrCreateGuestId();
      const headers: Record<string, string> = {};
      await fetchClient<void>('/api/v1/cart', {
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData<CartResponse>(cartKeys.detail(), {
        user_id: '',
        items: [],
        total_amount_clp: 0,
        total_items_count: 0,
      });
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

/**
 * Hook para consultar la salud del microservicio de carrito (GET /api/v1/cart/health)
 */
export const useCartHealthQuery = () => {
  return useQuery<CartHealthResponse>({
    queryKey: cartKeys.health(),
    queryFn: async () => {
      return await fetchClient<CartHealthResponse>('/api/v1/cart/health');
    },
  });
};

