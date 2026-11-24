/**
 * Política de contraseña del User Pool de Cognito (nexus-lab-users): mínimo 12 caracteres, con
 * mayúscula, minúscula, número y símbolo. Validarla en el cliente evita viajes inútiles; el BFF y
 * Cognito la vuelven a exigir.
 */
export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.";

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    password.length <= 256 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
