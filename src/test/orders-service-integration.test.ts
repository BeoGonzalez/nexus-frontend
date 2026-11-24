import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import type {
  OrderResponse,
  OrdersHealthResponse,
} from '@/domain/models';

const ORDERS_URL = process.env.NEXT_PUBLIC_ORDERS_API_URL || 'http://localhost:8004';

describe('Nexus Orders Service & BFF Integration Tests (Orders Microservice OAS 3.1 / Saga & Outbox)', () => {
  const testUserId = `test-orders-user-${Date.now()}`;
  const testUserEmail = `orders-${Date.now()}@nexus.cl`;
  // ID real del catálogo (Spider-Man 2)
  const sampleProductId = '5babe93b-725f-4e7d-9c63-565a2870695b';

  let createdOrderId: string = '';

  beforeAll(() => {
    process.env.NEXT_PUBLIC_ORDERS_API_URL = ORDERS_URL;
  });

  it('1. GET /api/v1/orders/health — Debe responder con status 200 y servicio orders-service activo', async () => {
    const health = await fetchClient<OrdersHealthResponse>('/api/v1/orders/health');
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('orders-service');
  });

  it('2. POST /api/v1/orders — Debe crear una orden con estado PENDING y cálculo de montos CLP', async () => {
    const newOrderPayload = {
      items: [
        {
          product_id: sampleProductId,
          quantity: 2,
        },
      ],
      idempotency_key: `idemp-${Date.now()}`,
    };

    const createdOrder = await fetchClient<OrderResponse>('/api/v1/orders', {
      method: 'POST',
      headers: {
        'X-User-Id': testUserId,
        'X-User-Email': testUserEmail,
        'X-User-Role': 'customer',
      },
      body: JSON.stringify(newOrderPayload),
    });

    expect(createdOrder).toBeDefined();
    expect(createdOrder.id).toBeDefined();
    expect(createdOrder.user_id).toBe(testUserId);
    expect(createdOrder.user_email).toBe(testUserEmail);
    expect(createdOrder.status).toBe('PENDING');
    expect(Array.isArray(createdOrder.items)).toBe(true);
    expect(createdOrder.items.length).toBe(1);

    const item = createdOrder.items[0];
    expect(item.product_id).toBe(sampleProductId);
    expect(item.quantity).toBe(2);
    expect(item.unit_price_clp).toBeGreaterThan(0);
    expect(item.subtotal_clp).toBe(item.unit_price_clp * 2);
    expect(createdOrder.total_amount_clp).toBe(item.subtotal_clp);

    createdOrderId = createdOrder.id;
  });

  it('3. GET /api/v1/orders/{order_id} — Debe consultar la orden creada por su identificador UUID', async () => {
    expect(createdOrderId).toBeTruthy();

    const order = await fetchClient<OrderResponse>(`/api/v1/orders/${createdOrderId}`);
    expect(order).toBeDefined();
    expect(order.id).toBe(createdOrderId);
    expect(order.user_id).toBe(testUserId);
    expect(order.status).toBe('PENDING');
  });

  it('4. POST /api/v1/orders/{order_id}/pay — Debe procesar el pago de la orden y transicionar a PAID', async () => {
    expect(createdOrderId).toBeTruthy();

    const paidOrder = await fetchClient<OrderResponse>(`/api/v1/orders/${createdOrderId}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        payment_id: `pay_gateway_${Date.now()}`,
      }),
    });

    expect(paidOrder).toBeDefined();
    expect(paidOrder.id).toBe(createdOrderId);
    expect(paidOrder.status).toBe('PAID');
  });

  it('5. GET /api/v1/orders — Debe listar las órdenes asociadas al usuario actual', async () => {
    const orders = await fetchClient<OrderResponse[]>('/api/v1/orders', {
      headers: {
        'X-User-Id': testUserId,
        'X-User-Email': testUserEmail,
      },
    });

    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThanOrEqual(1);

    const found = orders.find((o) => o.id === createdOrderId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('PAID');
  });

  it('6. POST /api/v1/orders sin items — Debe rechazar la creación con error de validación 422', async () => {
    try {
      await fetchClient<OrderResponse>('/api/v1/orders', {
        method: 'POST',
        headers: {
          'X-User-Id': testUserId,
        },
        body: JSON.stringify({
          items: [],
        }),
      });
      expect.fail('Debería haber rechazado la orden vacía');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(422);
    }
  });

  it('7. GET /api/v1/orders/{invalid_uuid} — Debe arrojar error 404 o 422 para UUID inexistente', async () => {
    try {
      await fetchClient<OrderResponse>('/api/v1/orders/00000000-0000-0000-0000-000000000000');
      expect.fail('Debería haber fallado con 404');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect([404, 422]).toContain(err.status);
    }
  });
});

