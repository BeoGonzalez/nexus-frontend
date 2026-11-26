/**
 * Contraseña de prueba que cumple la política del User Pool (≥12, mayúscula, minúscula, número y símbolo).
 *
 * Se genera en cada ejecución: los tests no versionan contraseñas literales que los escáneres de secretos
 * (GitGuardian, gitleaks) reportan como credenciales.
 */
export function policyPassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!#$%&*+-=?@^_';
  const all = upper + lower + digits;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
