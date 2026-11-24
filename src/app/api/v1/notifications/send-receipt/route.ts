import { NextResponse, type NextRequest } from 'next/server';
import type { OrderResponse, SendReceiptResponse } from '@/domain/models';
import { buildForwardHeaders } from '@/infrastructure/bff/forwardHeaders';
import {
  GENERIC,
  buildServiceUrl,
  errorResponse,
  gatewayErrorResponse,
  readJsonBody,
} from '@/infrastructure/bff/serviceProxy';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/infrastructure/bff/requestId';
import { SendReceiptInput, escapeHtml as e } from '@/infrastructure/bff/schemas';
import { securityLog } from '@/infrastructure/bff/securityLog';

/**
 * Emisión de boleta electrónica por correo (OWASP A01, A05, A06, A09, A10).
 *
 * - Esquema Zod estricto del cuerpo y límite de tamaño.
 * - Requiere sesión: el JWT viaja al microservicio, que solo envía al correo del titular.
 * - La orden se verifica EN EL SERVIDOR contra el microservicio de órdenes (pertenencia y total):
 *   el cliente no puede emitir boletas de órdenes ajenas ni con montos alterados.
 * - Todo dato interpolado en el HTML se escapa (sin inyección HTML en el correo).
 * - Logs sin PII y errores genéricos.
 */

const clp = (n: number) => `$${n.toLocaleString('es-CL')} CLP`;

function safeDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CL');
}

type Input = ReturnType<typeof SendReceiptInput.parse>;

function renderEmail({ customer_name, order_id, receipt }: Input): string {
  const itemsHtml = receipt.items
    .map(
      (it) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 8px; font-weight: 600; color: #f1f5f9;">${e(it.title)}</td>
          <td style="padding: 10px 8px; text-align: center; color: #94a3b8;">${e(it.quantity)}</td>
          <td style="padding: 10px 8px; text-align: right; color: #94a3b8;">${e(clp(it.unit_price_clp))}</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #48c8d8;">${e(clp(it.subtotal_clp))}</td>
        </tr>`
    )
    .join('');

  const keysHtml = receipt.license_keys
    .map(
      (k) => `
        <div style="background-color: #0b1522; border: 1px dashed #48c8d8; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">${e(k.product_title)}</div>
          <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #38bdf8; letter-spacing: 0.1em; margin-top: 4px;">${e(k.key)}</div>
        </div>`
    )
    .join('');

  return `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050b14; color: #e2e8f0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0e1726; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #062029 0%, #0d3846 100%); padding: 28px 24px; border-bottom: 2px solid #48c8d8;">
            <div style="font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">NEXUS DIGITAL STORE</div>
            <div style="font-size: 12px; color: #48c8d8; font-weight: 700; margin-top: 2px;">BOLETA ELECTRÓNICA DE VENTA Y LICENCIAS DIGITALES</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">R.U.T.: 76.892.140-K | Folio Electrónico N° ${e(receipt.folio)}</div>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; margin: 0 0 16px 0; color: #cbd5e1;">
              ¡Hola <strong>${e(customer_name || 'Gamer')}</strong>! Tu pago simulado ha sido procesado exitosamente en nuestro entorno Sandbox.
            </p>
            <div style="background-color: #070d17; border: 1px solid #1e293b; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b;">N° Orden:</span>
                <span style="font-family: monospace; color: #e2e8f0; font-weight: 600;">${e(order_id)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b;">Fecha de emisión:</span>
                <span style="color: #e2e8f0;">${e(safeDate(receipt.created_at))}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b;">Método de Pago:</span>
                <span style="color: #38bdf8; font-weight: 600;">${e(receipt.payment_method.brand)} (•••• ${e(receipt.payment_method.last4)})</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">ID Transacción Simulada:</span>
                <span style="font-family: monospace; color: #a5b4fc;">${e(receipt.transaction_id)}</span>
              </div>
            </div>
            <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #48c8d8; margin: 20px 0 10px 0;">
              Detalle de Productos
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #334155; color: #64748b; font-size: 11px; text-transform: uppercase;">
                  <th style="text-align: left; padding: 6px 8px;">Juego / Software</th>
                  <th style="text-align: center; padding: 6px 8px;">Cant.</th>
                  <th style="text-align: right; padding: 6px 8px;">Unitario</th>
                  <th style="text-align: right; padding: 6px 8px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div style="border-top: 1px solid #1e293b; padding-top: 12px; margin-bottom: 24px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #94a3b8;">
                <span>Subtotal Neto:</span>
                <span>${e(clp(receipt.subtotal_neto_clp))}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #94a3b8;">
                <span>IVA (19%):</span>
                <span>${e(clp(receipt.iva_clp))}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #ffffff; border-top: 1px dashed #334155; padding-top: 8px;">
                <span>TOTAL PAGADO:</span>
                <span style="color: #48c8d8;">${e(clp(receipt.total_clp))}</span>
              </div>
            </div>
            <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin: 24px 0 12px 0;">
              🔑 Claves de Activación Digital
            </h3>
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 12px 0;">
              Canjea estas licencias directamente en las plataformas correspondientes (Steam, PlayStation Network, Xbox o Epic Games):
            </p>
            ${keysHtml}
            <div style="margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0;"><strong>Emisor:</strong> NEXUS DIGITAL STORE SpA | Giro: Venta de Software y Contenido Digital</p>
              <p style="margin: 2px 0;">Casa Matriz: Av. Providencia 1208, Of. 601, Santiago, Chile</p>
              <p style="margin: 6px 0 0 0; color: #48c8d8;">El acuse de recibo de esta boleta electrónica ha sido validado en el sistema.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
}

/** Comprueba en el servidor que la orden existe, es del usuario autenticado y cuadra en monto. */
async function verifyOrder(input: Input, headers: Headers, requestId: string): Promise<NextResponse | null> {
  const url = buildServiceUrl('orders', ['api', 'v1', 'orders'], [input.order_id]);
  if (!url) return errorResponse(422, GENERIC.badRequest);

  const res = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) return errorResponse(401, GENERIC.unauthorized);
  if (res.status >= 500) return gatewayErrorResponse(requestId);
  if (!res.ok) {
    securityLog('warn', 'authz.denied', { route: 'send-receipt', reason: 'order_not_accessible', status: res.status });
    return errorResponse(403, GENERIC.forbidden);
  }

  const order = (await res.json().catch(() => null)) as Partial<OrderResponse> | null;
  if (!order || typeof order.total_amount_clp !== 'number') return gatewayErrorResponse(requestId);
  if (order.total_amount_clp !== input.receipt.total_clp) {
    securityLog('warn', 'input.rejected', { route: 'send-receipt', reason: 'total_mismatch' });
    return errorResponse(422, GENERIC.badRequest);
  }
  if (order.user_email && order.user_email.toLowerCase() !== input.customer_email) {
    securityLog('warn', 'authz.denied', { route: 'send-receipt', reason: 'email_mismatch' });
    return errorResponse(403, GENERIC.forbidden);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const raw = await readJsonBody(request);
    if (!raw.ok) return raw.response;
    const parsed = SendReceiptInput.safeParse(raw.body);
    if (!parsed.success) {
      return errorResponse(400, 'Datos incompletos para la emisión y envío de la boleta electrónica.');
    }
    const input = parsed.data;

    const headers = buildForwardHeaders(request);
    headers.set(REQUEST_ID_HEADER, requestId);
    if (!headers.has('authorization')) return errorResponse(401, GENERIC.unauthorized);

    const rejection = await verifyOrder(input, headers, requestId);
    if (rejection) return rejection;

    const { customer_name, customer_email, order_id, receipt } = input;
    const backendResponse = await fetch(
      buildServiceUrl('notifications', ['api', 'v1', 'notifications', 'send-receipt'])!,
      {
        method: 'POST',
        // El backend solo envía la boleta al correo del usuario del token: hay que reenviarlo.
        headers,
        body: JSON.stringify({
          order_id,
          customer_email,
          customer_name,
          receipt,
          folio: receipt.folio,
          total_amount_clp: receipt.total_clp,
          items: receipt.items,
          license_keys: receipt.license_keys,
          transaction_id: receipt.transaction_id,
          subject: `🎮 Boleta Electrónica #${receipt.folio} — Confirmación de Compra en Nexus Store`,
          html_content: renderEmail(input),
        }),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!backendResponse.ok) {
      if (backendResponse.status >= 500) {
        securityLog('error', 'upstream.error', {
          service: 'notifications',
          status: backendResponse.status,
          request_id: requestId,
        });
        return gatewayErrorResponse(requestId);
      }
      // 401/403/400 del backend: se conserva el código, con mensaje genérico.
      const msg: Record<number, string> = { 401: GENERIC.unauthorized, 403: GENERIC.forbidden };
      return errorResponse(backendResponse.status, msg[backendResponse.status] || GENERIC.badRequest);
    }

    const backendData = (await backendResponse.json().catch(() => ({}))) as { sent_at?: unknown };
    securityLog('info', 'notification.sent', { kind: 'receipt', order: order_id, request_id: requestId });

    const responsePayload: SendReceiptResponse = {
      success: true,
      message: 'Boleta electrónica y claves enviadas exitosamente a tu correo.',
      order_id,
      recipient_email: customer_email,
      sent_at: typeof backendData.sent_at === 'string' ? backendData.sent_at : new Date().toISOString(),
    };
    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    securityLog('error', 'upstream.unreachable', { service: 'notifications', error, request_id: requestId });
    return gatewayErrorResponse(requestId);
  }
}
