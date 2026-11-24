import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import type {
  AssistantHealthResponse,
  ResetSessionResponse,
} from '@/domain/models';

const ASSISTANT_URL =
  process.env.NEXT_PUBLIC_ASSISTANT_API_URL || 'http://localhost:8007';

describe('Nexus AI Agent & Assistant Service Integration Tests (LLM / RAG / Streaming SSE)', () => {
  const testSessionId = `vitest-session-${Date.now()}`;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_ASSISTANT_API_URL = ASSISTANT_URL;
  });

  it('1. GET /api/v1/assistant/health — Debe responder con status 200 y servicio ai-agent-service activo', async () => {
    const health = await fetchClient<AssistantHealthResponse>(
      '/api/v1/assistant/health'
    );
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('ai-agent-service');
  });

  it('2. POST /api/v1/assistant/chat — Debe iniciar stream SSE con tokens generados por el LLM', async () => {
    const response = await fetch(`${ASSISTANT_URL}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hola, recomiéndame un juego de acción',
        session_id: testSessionId,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();

    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let chunkCount = 0;
    let accumulatedText = '';

    while (chunkCount < 5) {
      const { value, done } = await reader.read();
      if (done) break;
      chunkCount++;
      accumulatedText += decoder.decode(value, { stream: true });
    }

    // Cancel reader to avoid hanging stream
    await reader.cancel();

    expect(accumulatedText).toContain('data:');
  });

  it('3. DELETE /api/v1/assistant/session/{session_id} — Debe reiniciar la memoria conversacional en MemorySaver', async () => {
    const result = await fetchClient<ResetSessionResponse>(
      `/api/v1/assistant/session/${testSessionId}`,
      {
        method: 'DELETE',
      }
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('cleared');
    expect(result.session_id).toBe(testSessionId);
  });
});

