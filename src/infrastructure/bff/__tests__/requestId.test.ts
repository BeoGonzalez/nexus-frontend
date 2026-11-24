import { describe, expect, it } from 'vitest';
import { REQUEST_ID_HEADER, isValidRequestId, resolveRequestId } from '../requestId';

describe('X-Request-ID (OWASP A09: correlación)', () => {
  it('usa el nombre de cabecera estándar', () => {
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
  });

  it.each(['abcdefgh', 'r-123456789', 'a.b_c-d.123456', '3f6678d1-829b-494e-a94c-f49ff420ebad'])('acepta %j', (id) => {
    expect(isValidRequestId(id)).toBe(true);
    expect(resolveRequestId(id)).toBe(id);
  });

  it.each(['short', 'a'.repeat(65), 'abc\r\nX-Admin: 1', 'id con espacios', '<script>abc', '', null, undefined])(
    'descarta %j y genera uno válido',
    (id) => {
      expect(isValidRequestId(id)).toBe(false);
      const out = resolveRequestId(id);
      expect(isValidRequestId(out)).toBe(true);
      expect(out).not.toBe(id);
    }
  );

  it('genera identificadores distintos', () => {
    expect(resolveRequestId(null)).not.toBe(resolveRequestId(null));
  });
});
