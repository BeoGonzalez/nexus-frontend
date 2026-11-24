import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type { NotificationsHealthResponse } from '@/domain/models';

const NOTIFICATIONS_URL =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'http://localhost:8005';

describe('Nexus Notifications Service & BFF Integration Tests (Notifications OAS 3.1 / Event-Driven)', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL = NOTIFICATIONS_URL;
  });

  it('1. GET /api/v1/notifications/health — Debe responder con status 200 y servicio notifications-service activo', async () => {
    const health = await fetchClient<NotificationsHealthResponse>(
      '/api/v1/notifications/health'
    );
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('notifications-service');
  });

  it('2. GET /api/v1/notifications/health con URL absoluta — Debe responder con el estado operativo del microservicio', async () => {
    const health = await fetchClient<NotificationsHealthResponse>(
      `${NOTIFICATIONS_URL}/api/v1/notifications/health`
    );
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('notifications-service');
  });
});

