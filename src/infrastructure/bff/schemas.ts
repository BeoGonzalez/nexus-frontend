import { z } from 'zod';

/**
 * OWASP A05 — Esquemas de validación de entrada del BFF (Route Handlers y Server Actions).
 * Todo dato que cruza la frontera navegador → servidor se valida aquí antes de usarse.
 */

/** Identificador de recurso seguro para interpolar en rutas (UUID, slug o entero). */
export const ResourceId = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, 'id inválido');

/** Paginación de `searchParams` (skip/limit acotados). */
export const Pagination = z.object({
  skip: z.coerce.number().int().min(0).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function parsePagination(searchParams: URLSearchParams) {
  return Pagination.safeParse({
    skip: searchParams.get('skip') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
}

export const OrderItemInput = z
  .object({
    product_id: ResourceId,
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

/**
 * El cliente SOLO envía qué compra y cuánto; precios, totales y stock los calcula el backend
 * (OWASP A06 — la lógica de negocio crítica vive en el servidor).
 */
export const CreateOrderInput = z
  .object({
    items: z.array(OrderItemInput).min(1).max(50),
    idempotency_key: z
      .string()
      .regex(/^[A-Za-z0-9._:-]{1,128}$/)
      .nullish(),
  })
  .strict();

export const PaymentMethodInput = z
  .object({
    card_number: z
      .string()
      .transform((v) => v.replace(/\s+/g, ''))
      .pipe(z.string().regex(/^[0-9]{12,19}$/)),
    card_brand: z.string().trim().max(40).optional(),
    is_default: z.boolean().optional().default(false),
  })
  .strict();

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((u) => /^https:\/\//i.test(u), 'Solo se permiten URLs https');

const money = z.number().int().nonnegative().max(1_000_000_000);
const shortText = (max: number) => z.string().trim().max(max);

export const SendReceiptInput = z
  .object({
    order_id: ResourceId,
    customer_email: z.string().trim().toLowerCase().email().max(254),
    customer_name: shortText(100).optional(),
    receipt: z
      .object({
        folio: z.union([z.string().max(40), z.number().int()]).transform(String),
        created_at: z.string().max(64),
        transaction_id: shortText(128),
        payment_method: z.object({ brand: shortText(40), last4: z.string().regex(/^[0-9]{4}$/) }).loose(),
        items: z
          .array(
            z
              .object({
                title: shortText(200),
                quantity: z.number().int().min(1).max(100),
                unit_price_clp: money,
                subtotal_clp: money,
              })
              .loose()
          )
          .min(1)
          .max(50),
        license_keys: z
          .array(z.object({ product_title: shortText(200), key: shortText(128) }).loose())
          .max(100),
        subtotal_neto_clp: money,
        iva_clp: money,
        total_clp: money,
      })
      .loose(),
  })
  .loose();

/** Escapa texto para interpolarlo de forma segura en HTML (correos, plantillas). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Cuerpo de `POST /api/v1/assistant/chat` — réplica de `ChatRequest` (extra="forbid") del
 * ai-agent-service. Se valida en el BFF para no gastar cuota con inyecciones estructurales (LLM01)
 * ni cuerpos desmedidos (LLM10).
 */
export const AssistantChatInput = z
  .object({
    query: z.string().max(2000).optional(),
    message: z.string().max(2000).nullish(),
    chat_history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }).strict())
      .max(50)
      .optional(),
    session_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).nullish(),
  })
  .strict()
  .refine((b) => Boolean(b.query?.trim() || b.message?.trim()), { message: 'query o message requerido' });

/** Alta de producto: réplica de `CreateProductRequest` de catalog-service (A05). */
export const CreateProductInput = z
  .object({
    title: z.string().trim().min(2).max(255),
    description: z.string().trim().max(5000),
    price_clp: z.number().int().positive().max(100_000_000),
    stock: z.number().int().min(0).max(1_000_000),
    image_url: httpsUrl.nullish(),
    platform_name: z.string().trim().max(60).nullish(),
    genre_names: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  })
  .strict();

/** Ajuste de stock: `PATCH /products/{uuid}/stock` con `{ delta }` (≠ 0, acotado). */
export const AdjustStockInput = z.object({
  id: z.string().uuid(),
  delta: z
    .number()
    .int()
    .refine((d) => d !== 0 && Math.abs(d) <= 10_000),
});
