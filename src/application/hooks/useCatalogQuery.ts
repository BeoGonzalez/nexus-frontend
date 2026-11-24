import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type {
  ProductResponse,
  CreateProductRequest,
  UpdateStockRequest,
  UpdateStockResponse,
  CatalogHealthResponse,
} from '@/domain/models';

export const catalogKeys = {
  all: ['catalog'] as const,
  products: () => [...catalogKeys.all, 'products'] as const,
  productList: (skip?: number, limit?: number) =>
    [...catalogKeys.products(), { skip, limit }] as const,
  productDetail: (id: string) => [...catalogKeys.products(), 'detail', id] as const,
  health: () => [...catalogKeys.all, 'health'] as const,
};

/**
 * Hook para obtener la lista paginada de productos del catálogo (GET /api/v1/catalog/products)
 */
export const useCatalogProductsQuery = (params: { skip?: number; limit?: number } = {}) => {
  const { skip = 0, limit = 50 } = params;
  return useQuery<ProductResponse[]>({
    queryKey: catalogKeys.productList(skip, limit),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (skip !== undefined) query.set('skip', String(skip));
      if (limit !== undefined) query.set('limit', String(limit));
      const queryString = query.toString();
      return await fetchClient<ProductResponse[]>(
        `/api/v1/catalog/products${queryString ? `?${queryString}` : ''}`
      );
    },
  });
};

/**
 * Hook para obtener el detalle de un producto específico (GET /api/v1/catalog/products/{product_id})
 */
export const useCatalogProductQuery = (productId?: string) => {
  return useQuery<ProductResponse>({
    queryKey: catalogKeys.productDetail(productId || ''),
    queryFn: async () => {
      if (!productId) throw new Error('Se requiere un ID de producto válido');
      return await fetchClient<ProductResponse>(`/api/v1/catalog/products/${productId}`);
    },
    enabled: Boolean(productId),
  });
};

/**
 * Hook para crear un producto en el catálogo (POST /api/v1/catalog/products)
 */
export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ProductResponse, Error, CreateProductRequest>({
    mutationFn: async (payload: CreateProductRequest) => {
      return await fetchClient<ProductResponse>('/api/v1/catalog/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products() });
    },
  });
};

/**
 * Hook para actualizar el inventario de un producto (PATCH /api/v1/catalog/products/{product_id}/stock)
 */
export const useUpdateStockMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateStockResponse, Error, { productId: string; delta: number }>({
    mutationFn: async ({ productId, delta }) => {
      return await fetchClient<UpdateStockResponse>(`/api/v1/catalog/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ delta } as UpdateStockRequest),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products() });
      queryClient.invalidateQueries({
        queryKey: catalogKeys.productDetail(variables.productId),
      });
    },
  });
};

/**
 * Hook para consultar el estado de salud del catálogo (GET /api/v1/catalog/health)
 */
export const useCatalogHealthQuery = () => {
  return useQuery<CatalogHealthResponse>({
    queryKey: catalogKeys.health(),
    queryFn: async () => {
      return await fetchClient<CatalogHealthResponse>('/api/v1/catalog/health');
    },
  });
};

