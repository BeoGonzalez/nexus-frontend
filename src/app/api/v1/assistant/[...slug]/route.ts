import type { NextRequest } from 'next/server';
import {
  GENERIC,
  createProxyRoute,
  errorResponse,
  proxyToService,
  readJsonBody,
} from '@/infrastructure/bff/serviceProxy';
import { AssistantChatInput } from '@/infrastructure/bff/schemas';
import { securityLog } from '@/infrastructure/bff/securityLog';

// OWASP A01/A05/A10 + LLM01/LLM10: proxy con lista blanca y, para el chat, el mismo esquema
// estricto que el ai-agent-service (sin campos extra, roles acotados, longitudes máximas).
const base = createProxyRoute('assistant', {
  fixed: ['api', 'v1', 'assistant'],
  methods: ['GET', 'POST', 'DELETE'],
  streamMethods: ['POST'],
});

/** 20 turnos × 8000 caracteres como máximo útil (el backend usa solo los últimos 20). */
const MAX_CHAT_BODY_BYTES = 200 * 1024;

type Ctx = { params: Promise<{ slug: string[] }> };

export const GET = base.GET;
export const DELETE = base.DELETE;

export async function POST(request: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  if (slug.length !== 1 || slug[0] !== 'chat') return base.POST(request, context);

  const raw = await readJsonBody(request, MAX_CHAT_BODY_BYTES);
  if (!raw.ok) return raw.response;
  const parsed = AssistantChatInput.safeParse(raw.body);
  if (!parsed.success) {
    securityLog('info', 'input.rejected', { service: 'assistant', reason: 'chat_schema' });
    return errorResponse(422, GENERIC.badRequest);
  }
  return proxyToService(request, {
    service: 'assistant',
    fixed: ['api', 'v1', 'assistant', 'chat'],
    method: 'POST',
    stream: true,
    body: parsed.data,
  });
}
