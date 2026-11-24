import { ApiErrorDetail } from "@/domain/models";

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: unknown;
  /** Segundos de `Retry-After` en un 429 (A07); `null` si no aplica. */
  public retryAfter: number | null;

  constructor(status: number, statusText: string, data: unknown, retryAfter: number | null = null) {
    // Normalizar mensaje de error de FastAPI (solo texto acotado; nunca estructuras completas).
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string"
        ? detail.slice(0, 300)
        : Array.isArray(detail)
          ? (detail as ApiErrorDetail[]).map((err) => err.msg).join(", ").slice(0, 300)
          : statusText || "Unknown API Error";

    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

/**
 * Cliente HTTP del navegador hacia el BFF (mismo origen).
 *
 * OWASP A01: solo rutas relativas `/api/**`; el navegador nunca conoce hosts de microservicios.
 * OWASP A04: no lee ni envía JWT. La sesión viaja sola en la cookie HttpOnly (`credentials:
 * 'same-origin'`) y el BFF la traduce a `Authorization` hacia los microservicios.
 * Las pruebas de integración contra microservicios reescriben estas rutas en su propio setup
 * (src/test/integration-setup.ts), nunca aquí.
 */
export const fetchClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // Solo rutas relativas: impide que un endpoint manipulado apunte a otro host.
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new ApiError(400, "Bad Request", { detail: "Endpoint inválido" });
  }
  const url = endpoint;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  // Si la respuesta no es OK (2xx), lanzamos la clase personalizada de Error
  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    const ra = response.headers.get("retry-after");
    const retryAfter = ra && /^\d+$/.test(ra.trim()) ? Number(ra) : null;
    throw new ApiError(response.status, response.statusText, errorData, retryAfter);
  }

  // Si la respuesta es 204 No Content o vacía
  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};
