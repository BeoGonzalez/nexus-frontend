/**
 * Grafana Faro (Frontend Observability): Web Vitals, errores de JavaScript y sesiones del navegador.
 *
 * - Solo se activa con `NEXT_PUBLIC_FARO_URL` (https, sin credenciales). Esa URL es pública por diseño: la usa el
 *   navegador. No lleva el token de Grafana Cloud.
 * - Privacidad (OWASP A02/A09): antes de enviar se eliminan query y fragmento de TODAS las URLs (códigos de
 *   recuperación, emails, búsquedas). No se identifica al usuario.
 */

export interface FaroConfig {
  url: string;
  origin: string;
}

export function faroConfig(): FaroConfig | null {
  const raw = (process.env.NEXT_PUBLIC_FARO_URL || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return { url: parsed.toString(), origin: parsed.origin };
  } catch {
    return null;
  }
}

/** Quita query string y fragmento (pueden llevar tokens o datos personales). */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

type Scrubbable = Record<string, unknown>;

function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (typeof value === 'string') return /^(https?:\/\/|\/)/.test(value) ? scrubUrl(value) : value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  if (typeof value === 'object') {
    const out: Scrubbable = {};
    for (const [k, v] of Object.entries(value as Scrubbable)) out[k] = scrubDeep(v, depth + 1);
    return out;
  }
  return value;
}

let started = false;

/** Inicializa Faro una sola vez, en el navegador. Nunca lanza: la observabilidad no debe romper la tienda. */
export async function initFaro(): Promise<void> {
  if (started || typeof window === 'undefined') return;
  const config = faroConfig();
  if (!config) return;
  started = true;
  try {
    const { initializeFaro, getWebInstrumentations } = await import('@grafana/faro-web-sdk');
    initializeFaro({
      url: config.url,
      app: {
        name: 'nexus-frontend',
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
        environment: process.env.NODE_ENV,
      },
      instrumentations: getWebInstrumentations({ captureConsole: false }),
      sessionTracking: { enabled: true, persistent: false },
      beforeSend: (item) => scrubDeep(item) as typeof item,
    });
  } catch {
    started = false;
  }
}
