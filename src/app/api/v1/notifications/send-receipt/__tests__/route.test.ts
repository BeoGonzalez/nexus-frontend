// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';
const ORDER_ID = '3f6678d1-829b-494e-a94c-f49ff420ebad';

const BODY = {
  order_id: ORDER_ID,
  customer_name: 'Ana',
  customer_email: 'ana@b.cl',
  receipt: {
    folio: 'BOL-1',
    order_id: ORDER_ID,
    created_at: '2026-11-22T12:00:00Z',
    customer_name: 'Ana',
    customer_email: 'ana@b.cl',
    payment_method: { brand: 'VISA', last4: '4242', type: 'SIMULATED_CARD' },
    subtotal_neto_clp: 10000,
    iva_clp: 1900,
    total_clp: 11900,
    transaction_id: 'TX-1',
    items: [{ title: 'Hades II', quantity: 1, unit_price_clp: 11900, subtotal_clp: 11900 }],
    license_keys: [{ product_title: 'Hades II', key: 'AAAA-BBBB' }],
    issuer: { company: 'Nexus', rut: '76.892.140-K', address: 'Santiago', activity: 'Venta digital' },
    email_sent: false,
  },
};

const ORDER = { id: ORDER_ID, user_id: 'u1', user_email: 'ana@b.cl', status: 'PAID', items: [], total_amount_clp: 11900 };

function makeRequest(headers: Record<string, string> = {}, body: unknown = BODY) {
  return new NextRequest('http://localhost/api/v1/notifications/send-receipt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  responses.forEach((r) => fetchMock.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/v1/notifications/send-receipt (BFF)', () => {
  it('verifica la orden con el token del usuario y reenvía el token al microservicio de notificaciones', async () => {
    const fetchMock = mockFetch(json(ORDER), json({ success: true }));
    vi.spyOn(console, 'info').mockImplementation(() => {});

    const res = await POST(makeRequest({ authorization: `Bearer ${JWT}` }));

    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(new RegExp(`/api/v1/orders/${ORDER_ID}$`));
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('authorization')).toBe(`Bearer ${JWT}`);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/v1\/notifications\/send-receipt$/);
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('authorization')).toBe(`Bearer ${JWT}`);
  });

  it('reenvía el X-Request-ID a órdenes y notificaciones', async () => {
    const fetchMock = mockFetch(json(ORDER), json({ success: true }));
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await POST(makeRequest({ authorization: `Bearer ${JWT}`, 'x-request-id': 'req-receipt-01' }));
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-request-id')).toBe('req-receipt-01');
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('x-request-id')).toBe('req-receipt-01');
  });

  it('sin sesión responde 401 sin contactar a los microservicios', async () => {
    const fetchMock = mockFetch();
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza (403) boletas de órdenes que no pertenecen al usuario', async () => {
    const fetchMock = mockFetch(json({ detail: 'Not found' }, 404));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await POST(makeRequest({ authorization: `Bearer ${JWT}` }));
    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza (422) montos alterados por el cliente', async () => {
    const fetchMock = mockFetch(json({ ...ORDER, total_amount_clp: 99_990 }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await POST(makeRequest({ authorization: `Bearer ${JWT}` }));
    expect(res.status).toBe(422);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('escapa el HTML del correo (sin inyección de etiquetas)', async () => {
    const fetchMock = mockFetch(json(ORDER), json({ success: true }));
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const evil = { ...BODY, customer_name: '<img src=x onerror=alert(1)>' };
    await POST(makeRequest({ authorization: `Bearer ${JWT}` }, evil));
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(sent.html_content).not.toContain('<img src=x');
    expect(sent.html_content).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('valida el esquema del cuerpo (400) antes de llamar al backend', async () => {
    const fetchMock = mockFetch();
    const res = await POST(makeRequest({ authorization: `Bearer ${JWT}` }, { order_id: '../../admin' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un 5xx del backend se traduce a 502 genérico sin filtrar el detalle interno', async () => {
    mockFetch(json(ORDER), json({ detail: 'psycopg2.OperationalError: host db-internal:5432' }, 500));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(makeRequest({ authorization: `Bearer ${JWT}` }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('psycopg2');
  });
});
