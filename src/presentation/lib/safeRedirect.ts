/**
 * OWASP A01 (Open Redirect) / A05 (XSS vía `javascript:`).
 *
 * Normaliza un destino de redirección controlado por el usuario (p. ej. `?redirect=`) a una ruta
 * RELATIVA del mismo origen. Rechaza esquemas (`javascript:`, `data:`, `https:`), URLs
 * protocol-relative (`//evil.com`, `/\evil.com`), caracteres de control y cualquier destino que
 * resuelva a otro origen. Ante cualquier duda devuelve `fallback`.
 */
const SENTINEL_ORIGIN = "https://nexus.invalid";

export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  // Alias heredado: ?redirect=checkout abre el checkout en la home.
  if (raw === "checkout") return "/?checkout=open";
  if (raw.length > 512) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;

  try {
    const url = new URL(raw, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
