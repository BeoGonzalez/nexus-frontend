import 'server-only';
import { securityLog } from './securityLog';

/**
 * Revocación real del refresh token en Cognito al cerrar sesión (OWASP A07).
 *
 * auth-service no expone /logout, así que el BFF llama directamente a la API pública de Cognito
 * `RevokeToken` (el app client no tiene secreto y `EnableTokenRevocation` está activo). Revocar el
 * refresh token invalida también los access/ID tokens emitidos con él.
 *
 * SSRF: el host es fijo (`cognito-idp.<region>.amazonaws.com`) y la región se valida con regex.
 * Nunca lanza: un fallo de Cognito no debe impedir borrar las cookies.
 */
const REGION_RE = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;
const CLIENT_ID_RE = /^[A-Za-z0-9]{1,128}$/;

export async function revokeRefreshToken(refreshToken: string, requestId: string): Promise<boolean> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const clientId = process.env.COGNITO_CLIENT_ID || '';
  if (!REGION_RE.test(region) || !CLIENT_ID_RE.test(clientId)) {
    securityLog('warn', 'auth.logout', { request_id: requestId, revoke: 'skipped_invalid_config' });
    return false;
  }
  try {
    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken',
      },
      body: JSON.stringify({ Token: refreshToken, ClientId: clientId }),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) securityLog('warn', 'auth.logout', { request_id: requestId, revoke: 'failed', status: res.status });
    return res.ok;
  } catch (error) {
    securityLog('warn', 'auth.logout', { request_id: requestId, revoke: 'unreachable', error });
    return false;
  }
}
