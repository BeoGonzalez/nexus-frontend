import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAiAssistant } from '@/application/hooks/useAiAssistant';

/** Respuesta SSE simulada del BFF (/api/v1/assistant/chat). */
function sse(events: object[], status = 200): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('useAiAssistant (guardrails OWASP LLM 2026)', () => {
  it('muestra el aviso de grounding (LLM07) junto a la respuesta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([
      { type: 'products', data: [] },
      { type: 'token', data: 'Hades II a $990 CLP' },
      { type: 'notice', data: 'Verifica el precio y el stock en la ficha del producto.' },
      { type: 'done' },
    ])));
    const { result } = renderHook(() => useAiAssistant());
    await act(() => result.current.sendMessage('precio de Hades'));
    const last = result.current.messages.at(-1)!;
    expect(last.content).toContain('Hades II a $990 CLP');
    expect(last.content).toContain('Verifica el precio y el stock');
  });

  it('ante 429 (cuota LLM06) informa el límite en vez de inventar una respuesta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'x' }), { status: 429 })));
    const { result } = renderHook(() => useAiAssistant());
    await act(() => result.current.sendMessage('hola'));
    expect(result.current.messages.at(-1)!.content).toMatch(/límite de mensajes/i);
  });

  it('ante 503 (kill switch / presupuesto, LLM10) informa indisponibilidad sin fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'x' }), { status: 503 })));
    const { result } = renderHook(() => useAiAssistant());
    await act(() => result.current.sendMessage('hola'));
    expect(result.current.messages.at(-1)!.content).toBe('El asistente no está disponible en este momento.');
  });

  it('el aviso notice va precedido de "⚠️" en un párrafo aparte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([
      { type: 'token', data: 'Respuesta' },
      { type: 'notice', data: 'Aviso.' },
      { type: 'done' },
    ])));
    const { result } = renderHook(() => useAiAssistant());
    await act(() => result.current.sendMessage('x'));
    expect(result.current.messages.at(-1)!.content).toBe('Respuesta\n\n⚠️ Aviso.');
  });

  it('reiniciar conversación borra la sesión remota vía BFF (same-origin, con cookie) y rota el id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAiAssistant());
    const before = sessionStorage.getItem('nexus_chat_session_id')!;
    await act(async () => result.current.clearChat());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/v1/assistant/session/${encodeURIComponent(before)}`);
    expect(init.method).toBe('DELETE');
    expect(init.credentials).toBe('same-origin');
    expect(sessionStorage.getItem('nexus_chat_session_id')).not.toBe(before);
    expect(sessionStorage.getItem('nexus_chat_session_id')).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it('un 401 (o error de red) al borrar la sesión no rompe la UI: la conversación se reinicia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const { result } = renderHook(() => useAiAssistant());
    await act(async () => result.current.clearChat());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await act(async () => result.current.clearChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('assistant');
  });

  it('envía como máximo los últimos 20 mensajes de historial', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse([{ type: 'token', data: 'ok' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAiAssistant());
    for (let i = 0; i < 12; i++) {
      await act(() => result.current.sendMessage(`mensaje ${i}`));
    }
    const body = JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string);
    expect(body.chat_history.length).toBeLessThanOrEqual(20);
  });
});
