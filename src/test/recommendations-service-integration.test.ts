import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import type {
  RecommendationResponse,
  RecommendationsHealthResponse,
} from '@/domain/models';

const RECOMMENDATIONS_URL =
  process.env.NEXT_PUBLIC_RECOMMENDATIONS_API_URL || 'http://localhost:8006';

describe('Nexus Recommendations Service & BFF Integration Tests (OAS 3.1 / Scoring de Afinidad)', () => {
  const testUserId = `test-user-${Date.now()}`;
  const testEmail = `gamer-${Date.now()}@nexus.cl`;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_RECOMMENDATIONS_API_URL = RECOMMENDATIONS_URL;
  });

  it('1. GET /api/v1/recommendations/health — Debe responder con status 200 y servicio recommendations-service activo', async () => {
    const health = await fetchClient<RecommendationsHealthResponse>(
      '/api/v1/recommendations/health'
    );
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('recommendations-service');
  });

  it('2. GET /api/v1/recommendations/trending — Debe retornar lista de juegos en tendencia con scoring de afinidad y motivos', async () => {
    const trending = await fetchClient<RecommendationResponse[]>(
      '/api/v1/recommendations/trending?limit=6'
    );

    expect(Array.isArray(trending)).toBe(true);
    expect(trending.length).toBeGreaterThan(0);

    const first = trending[0];
    expect(first).toBeDefined();
    expect(first.product_id).toBeDefined();
    expect(typeof first.title).toBe('string');
    expect(typeof first.price_clp).toBe('number');
    expect(typeof first.score).toBe('number');
    expect(first.score).toBeGreaterThan(0);
    expect(typeof first.recommendation_reason).toBe('string');
  });

  it('3. GET /api/v1/recommendations/for-you — Debe responder con recomendaciones personalizadas para el usuario', async () => {
    const forYou = await fetchClient<RecommendationResponse[]>(
      '/api/v1/recommendations/for-you?limit=4',
      {
        headers: {
          'X-User-Id': testUserId,
          'X-User-Email': testEmail,
          'X-User-Role': 'customer',
        },
      }
    );

    expect(Array.isArray(forYou)).toBe(true);
    expect(forYou.length).toBeGreaterThan(0);

    const item = forYou[0];
    expect(item.product_id).toBeDefined();
    expect(item.title).toBeDefined();
    expect(typeof item.score).toBe('number');
    expect(item.recommendation_reason).toBeDefined();
  });

  it('4. GET /api/v1/recommendations/trending con limit=1 — Debe respetar el límite solicitado', async () => {
    const limited = await fetchClient<RecommendationResponse[]>(
      '/api/v1/recommendations/trending?limit=1'
    );

    expect(Array.isArray(limited)).toBe(true);
    expect(limited.length).toBe(1);
  });

  it('5. GET /api/v1/recommendations/trending con limit inválido (excede max 20) — Debe retornar 422 Validation Error', async () => {
    try {
      await fetchClient<RecommendationResponse[]>(
        '/api/v1/recommendations/trending?limit=999'
      );
      expect.fail('Debería haber fallado con 422');
    } catch (e: unknown) {
      const err = e as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(422);
    }
  });
});

