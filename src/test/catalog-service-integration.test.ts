import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import type {
  ProductResponse,
  CatalogHealthResponse,
  UpdateStockResponse,
} from '@/domain/models';

const CATALOG_URL = process.env.NEXT_PUBLIC_CATALOG_API_URL || 'http://localhost:8002';

describe('Nexus Catalog Service & BFF Integration Tests (Catalog Microservice OAS 3.1)', () => {
  let createdProductId: string = '';

  beforeAll(() => {
    process.env.NEXT_PUBLIC_CATALOG_API_URL = CATALOG_URL;
  });

  it('1. GET /api/v1/catalog/health — Debe responder con status 200 y servicio catalog-service', async () => {
    const health = await fetchClient<CatalogHealthResponse>('/api/v1/catalog/health');
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('catalog-service');
  });

  it('2. GET /api/v1/catalog/products — Debe listar productos físicos de la base de datos', async () => {
    const products = await fetchClient<ProductResponse[]>('/api/v1/catalog/products');
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const firstProduct = products[0];
    expect(firstProduct.id).toBeDefined();
    expect(firstProduct.title).toBeDefined();
    expect(typeof firstProduct.price_clp).toBe('number');
    expect(typeof firstProduct.stock).toBe('number');
  });

  it('3. GET /api/v1/catalog/products?skip=0&limit=3 — Debe soportar paginación con query params', async () => {
    const products = await fetchClient<ProductResponse[]>('/api/v1/catalog/products?skip=0&limit=3');
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeLessThanOrEqual(3);
  });

  it('4. POST /api/v1/catalog/products — Debe crear un nuevo producto con credenciales admin', async () => {
    const newProductPayload = {
      title: `Horizon Forbidden West (Collector CI - ${Date.now()})`,
      description: 'Edición física especial para tests automatizados de integración.',
      price_clp: 49990,
      stock: 15,
      platform_name: 'PS5',
      genre_names: ['Acción', 'Aventura'],
    };

    const created = await fetchClient<ProductResponse>('/api/v1/catalog/products', {
      method: 'POST',
      headers: {
        'X-User-Role': 'admin',
        'X-User-Id': 'ci-admin-1',
      },
      body: JSON.stringify(newProductPayload),
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.title).toBe(newProductPayload.title);
    expect(created.price_clp).toBe(49990);
    expect(created.stock).toBe(15);

    createdProductId = created.id;
  });

  it('5. GET /api/v1/catalog/products/{product_id} — Debe obtener el detalle del producto creado', async () => {
    expect(createdProductId).toBeTruthy();

    const product = await fetchClient<ProductResponse>(`/api/v1/catalog/products/${createdProductId}`);
    expect(product).toBeDefined();
    expect(product.id).toBe(createdProductId);
    expect(product.stock).toBe(15);
  });

  it('6. PATCH /api/v1/catalog/products/{product_id}/stock — Debe actualizar el inventario aplicando delta', async () => {
    expect(createdProductId).toBeTruthy();

    const updateRes = await fetchClient<UpdateStockResponse>(
      `/api/v1/catalog/products/${createdProductId}/stock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ delta: -3 }),
      }
    );

    expect(updateRes).toBeDefined();

    // Verificamos que el stock disminuyó en 3 (de 15 a 12)
    const productAfter = await fetchClient<ProductResponse>(`/api/v1/catalog/products/${createdProductId}`);
    expect(productAfter.stock).toBe(12);
  });

  it('7. GET /api/v1/catalog/products/{invalid_uuid} — Debe arrojar error 404 o 422', async () => {
    try {
      await fetchClient<ProductResponse>('/api/v1/catalog/products/00000000-0000-0000-0000-000000000000');
      expect.fail('Debería haber lanzado ApiError para un UUID inexistente');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect([404, 422]).toContain(err.status);
    }
  });

  it('8. POST /api/v1/catalog/products sin credenciales — Debe rechazar con error de autorización', async () => {
    try {
      await fetchClient<ProductResponse>('/api/v1/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Sin permisos',
          description: 'No debería crearse',
          price_clp: 10000,
          stock: 1,
        }),
      });
      expect.fail('Debería haber rechazado la creación sin credenciales');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect([400, 401, 403, 422]).toContain(err.status);
    }
  });
});

