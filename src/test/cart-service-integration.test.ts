import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import type {
  CartResponse,
  CartHealthResponse,
} from '@/domain/models';

const CART_URL = process.env.NEXT_PUBLIC_CART_API_URL || 'http://localhost:8003';

describe('Nexus Cart Service & BFF Integration Tests (Cart Microservice OAS 3.1 / Redis)', () => {
  const testUserId = `test-cart-user-${Date.now()}`;
  // ID real existente en el microservicio de catálogo (Spider-Man 2)
  const sampleProductId = '5babe93b-725f-4e7d-9c63-565a2870695b';

  beforeAll(() => {
    process.env.NEXT_PUBLIC_CART_API_URL = CART_URL;
  });

  it('1. GET /api/v1/cart/health — Debe responder con status 200 y servicio cart-service activo', async () => {
    const health = await fetchClient<CartHealthResponse>('/api/v1/cart/health');
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('cart-service');
  });

  it('2. GET /api/v1/cart — Debe inicializar o retornar el carrito vacío para un nuevo usuario en Redis', async () => {
    const cart = await fetchClient<CartResponse>('/api/v1/cart', {
      headers: {
        'X-User-Id': testUserId,
      },
    });

    expect(cart).toBeDefined();
    expect(cart.user_id).toBe(testUserId);
    expect(Array.isArray(cart.items)).toBe(true);
    expect(cart.total_items_count).toBe(0);
    expect(cart.total_amount_clp).toBe(0);
  });

  it('3. POST /api/v1/cart/items — Debe agregar un producto físico al carrito y calcular subtotales', async () => {
    const updatedCart = await fetchClient<CartResponse>('/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'X-User-Id': testUserId,
      },
      body: JSON.stringify({
        product_id: sampleProductId,
        quantity: 2,
      }),
    });

    expect(updatedCart).toBeDefined();
    expect(updatedCart.user_id).toBe(testUserId);
    expect(updatedCart.total_items_count).toBe(2);
    expect(updatedCart.items.length).toBe(1);

    const item = updatedCart.items[0];
    expect(item.product_id).toBe(sampleProductId);
    expect(item.quantity).toBe(2);
    expect(item.unit_price_clp).toBeGreaterThan(0);
    expect(item.subtotal_clp).toBe(item.unit_price_clp * 2);
    expect(updatedCart.total_amount_clp).toBe(item.subtotal_clp);
  });

  it('4. PUT /api/v1/cart/items/{product_id} — Debe actualizar la cantidad del ítem en Redis', async () => {
    const updatedCart = await fetchClient<CartResponse>(`/api/v1/cart/items/${sampleProductId}`, {
      method: 'PUT',
      headers: {
        'X-User-Id': testUserId,
      },
      body: JSON.stringify({
        quantity: 5,
      }),
    });

    expect(updatedCart).toBeDefined();
    expect(updatedCart.total_items_count).toBe(5);
    const item = updatedCart.items.find((i) => i.product_id === sampleProductId);
    expect(item).toBeDefined();
    expect(item?.quantity).toBe(5);
  });

  it('5. DELETE /api/v1/cart — Debe vaciar el carrito completamente en Redis', async () => {
    await fetchClient<void>('/api/v1/cart', {
      method: 'DELETE',
      headers: {
        'X-User-Id': testUserId,
      },
    });

    // Consultamos nuevamente el carrito para verificar que quedó vacío
    const cartAfter = await fetchClient<CartResponse>('/api/v1/cart', {
      headers: {
        'X-User-Id': testUserId,
      },
    });

    expect(cartAfter).toBeDefined();
    expect(cartAfter.items.length).toBe(0);
    expect(cartAfter.total_items_count).toBe(0);
    expect(cartAfter.total_amount_clp).toBe(0);
  });

  it('6. GET /api/v1/cart sin credenciales ni X-User-Id — Debe rechazar con error de autorización', async () => {
    try {
      await fetchClient<CartResponse>('/api/v1/cart');
      expect.fail('Debería haber rechazado la petición sin cabeceras de usuario');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect([400, 401, 403, 422]).toContain(err.status);
    }
  });

  it('7. POST /api/v1/cart/items con datos inválidos — Debe retornar error de validación 422', async () => {
    try {
      await fetchClient<CartResponse>('/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          product_id: 'no-es-un-uuid',
          quantity: -5,
        }),
      });
      expect.fail('Debería haber fallado la validación de UUID y cantidad');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(422);
    }
  });
});

