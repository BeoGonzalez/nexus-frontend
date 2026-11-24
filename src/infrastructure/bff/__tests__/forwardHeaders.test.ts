import { describe, expect, it } from 'vitest';
import { buildForwardHeaders, sessionTokenFrom } from '../forwardHeaders';
import { SESSION_COOKIE } from '../sessionCookie';

type Cookies = Record<string, string>;

function req(headers: Record<string, string> = {}, cookies: Cookies = {}) {
  const h = new Headers(headers);
  return {
    headers: h,
    cookies: { get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined) },
  };
}

const GUEST = '0b6c7c55-6c0e-4b1a-9d43-2f4b8c1d7e10';
const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';
const JWT2 = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0NTYifQ.b3RyYWZpcm1h';

describe('buildForwardHeaders', () => {
  it('usa la cookie HttpOnly de sesión como Bearer', () => {
    const h = buildForwardHeaders(req({}, { [SESSION_COOKIE]: JWT }));
    expect(h.get('authorization')).toBe(`Bearer ${JWT}`);
    expect(h.get('content-type')).toBe('application/json');
  });

  it('la cookie de sesión tiene prioridad sobre un Authorization del cliente', () => {
    const h = buildForwardHeaders(req({ authorization: `Bearer ${JWT2}` }, { [SESSION_COOKIE]: JWT }));
    expect(h.get('authorization')).toBe(`Bearer ${JWT}`);
  });

  it('acepta Authorization Bearer con forma de JWT (clientes no-navegador)', () => {
    const h = buildForwardHeaders(req({ authorization: `Bearer ${JWT}` }));
    expect(h.get('authorization')).toBe(`Bearer ${JWT}`);
  });

  it('descarta Authorization malformado o con esquema distinto de Bearer', () => {
    expect(buildForwardHeaders(req({ authorization: 'Basic YWRtaW46YWRtaW4=' })).get('authorization')).toBeNull();
    expect(buildForwardHeaders(req({ authorization: 'Bearer abc' })).get('authorization')).toBeNull();
    expect(buildForwardHeaders(req({}, { [SESSION_COOKIE]: 'no-es-jwt' })).get('authorization')).toBeNull();
  });

  it('ignora la cookie heredada "token" (ya no es la cookie de sesión)', () => {
    expect(buildForwardHeaders(req({}, { token: JWT })).get('authorization')).toBeNull();
  });

  it('NUNCA reenvía cabeceras de identidad que controla el navegador', () => {
    const h = buildForwardHeaders(
      req({ 'x-user-id': 'victim', 'x-user-role': 'admin', 'x-user-email': 'v@x.cl' }, { [SESSION_COOKIE]: JWT })
    );
    expect(h.get('x-user-id')).toBeNull();
    expect(h.get('x-user-role')).toBeNull();
    expect(h.get('x-user-email')).toBeNull();
  });

  it('invitado: la cookie nexus_guest_id viaja como X-Guest-Id (no como X-User-Id)', () => {
    const h = buildForwardHeaders(req({}, { nexus_guest_id: GUEST }));
    expect(h.get('x-guest-id')).toBe(GUEST);
    expect(h.get('x-user-id')).toBeNull();
    expect(h.get('authorization')).toBeNull();
  });

  it('descarta ids de invitado con formato inválido', () => {
    const h = buildForwardHeaders(req({}, { nexus_guest_id: 'x; admin=1' }));
    expect(h.get('x-guest-id')).toBeNull();
  });

  it('con sesión no se envía el id de invitado', () => {
    const h = buildForwardHeaders(req({}, { [SESSION_COOKIE]: JWT, nexus_guest_id: GUEST }));
    expect(h.get('x-guest-id')).toBeNull();
  });

  it('reenvía Idempotency-Key (pagos) solo con formato seguro', () => {
    expect(buildForwardHeaders(req({ 'idempotency-key': 'k1' })).get('idempotency-key')).toBe('k1');
    expect(buildForwardHeaders(req({ 'idempotency-key': 'a b<c>' })).get('idempotency-key')).toBeNull();
  });
});

describe('sessionTokenFrom', () => {
  it('prefiere el ID token (trae email y grupos) sobre el access token', () => {
    expect(sessionTokenFrom({ id_token: 'id', access_token: 'acc' })).toBe('id');
  });

  it('cae al access token o al campo legado "token"', () => {
    expect(sessionTokenFrom({ access_token: 'acc' })).toBe('acc');
    expect(sessionTokenFrom({ token: 'legacy' })).toBe('legacy');
    expect(sessionTokenFrom({})).toBe('');
  });
});
