/**
 * OWASP A06 / A07 — Rate limiting de ventana deslizante en memoria.
 *
 * Suficiente para una instancia; con varias réplicas debe sustituirse por un almacén compartido
 * (Redis / ElastiCache, o AWS WAF rate-based rules) — ver informe de seguridad.
 */

interface Bucket {
  hits: number[];
  /** Ventana con la que se registró (para saber si ya venció sin conocer la regla). */
  windowMs: number;
  /** Instante hasta el que la clave está bloqueada (0 = no bloqueada). */
  blockedUntil: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Limitador con capacidad acotada y expulsión priorizada.
 *
 * Antes, superar la capacidad hacía `clear()`: un atacante que rotara IPs (trivial con IPv6) vaciaba
 * el mapa y desbloqueaba a todos. Ahora, al superar `maxKeys`, se expulsa en este orden:
 *   1. claves cuya ventana ya venció (no aportan nada);
 *   2. claves no bloqueadas, de la menos a la más reciente (LRU por orden de inserción del Map);
 *   3. solo como último recurso de memoria, claves bloqueadas (las más antiguas primero).
 * Cada acceso reinserta la clave al final del Map, así que el orden de iteración es el de uso.
 */
export function createRateLimiter(maxKeys = 50_000) {
  const buckets = new Map<string, Bucket>();

  // Al expulsar se baja al 90 %: amortiza el recorrido O(n) durante una inundación sostenida.
  const target = Math.max(1, Math.floor(maxKeys * 0.9));

  function evict(now: number) {
    if (buckets.size <= maxKeys) return;
    const excess = () => buckets.size - target;
    for (const [k, b] of buckets) {
      if (excess() <= 0) return;
      if (b.blockedUntil <= now && b.hits.every((t) => now - t >= b.windowMs)) buckets.delete(k);
    }
    for (const [k, b] of buckets) {
      if (excess() <= 0) return;
      if (b.blockedUntil <= now) buckets.delete(k);
    }
    for (const k of buckets.keys()) {
      if (excess() <= 0) return;
      buckets.delete(k);
    }
  }

  function hit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const bucket = buckets.get(key) ?? { hits: [], windowMs, blockedUntil: 0 };
    buckets.delete(key); // reinsertar al final = marcar como el más reciente
    bucket.windowMs = windowMs;
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

    if (bucket.hits.length >= limit) {
      bucket.blockedUntil = bucket.hits[0] + windowMs;
      buckets.set(key, bucket);
      evict(now);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)) };
    }

    bucket.blockedUntil = 0;
    bucket.hits.push(now);
    buckets.set(key, bucket);
    evict(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { hit, size: () => buckets.size, has: (key: string) => buckets.has(key) };
}

const defaultLimiter = createRateLimiter();

/** Limitador compartido del proceso (usado por src/proxy.ts). */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  return defaultLimiter.hit(key, limit, windowMs, now);
}

/**
 * IP del cliente detrás del ALB.
 *
 * El ALB de AWS está en modo `append`: AÑADE la IP real al FINAL de X-Forwarded-For y conserva lo
 * que envió el cliente al principio (falsificable). Por eso se toma la entrada situada
 * `TRUSTED_PROXY_HOPS` posiciones desde la derecha (por defecto 1 = el ALB).
 */
export function clientIp(headers: Headers): string {
  // Detrás de API Gateway HTTP no llega X-Forwarded-For: API Gateway SOBRESCRIBE esta cabecera con la
  // IP real ($context.identity.sourceIp). Solo se confía en ella si el despliegue la declara.
  const trusted = process.env.CLIENT_IP_HEADER?.trim();
  if (trusted) {
    const ip = headers.get(trusted)?.trim();
    if (ip) return ip.slice(0, 64);
  }
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const chain = xff.split(',').map((p) => p.trim()).filter(Boolean);
    const ip = chain[Math.max(0, chain.length - hops)];
    if (ip) return ip.slice(0, 64);
  }
  return (headers.get('x-real-ip') || 'unknown').slice(0, 64);
}
