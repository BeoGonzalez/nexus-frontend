"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Cuenta atrás para bloquear reintentos tras un 429 (OWASP A07): la UI deshabilita el envío
 * durante los segundos de `Retry-After` en lugar de dejar que el usuario (o un script) insista.
 * Se calcula contra un instante final, así que no deriva si la pestaña queda en segundo plano.
 */
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + Math.max(1, Math.min(3600, Math.ceil(seconds))) * 1000);
  }, []);

  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return { active: remaining > 0, remaining, start };
}

/** Segundos de espera si `err` es un 429 del BFF (por defecto 60); `null` si no lo es. */
export function retryAfterOf(err: unknown): number | null {
  const e = err as { status?: unknown; retryAfter?: unknown } | null;
  if (!e || e.status !== 429) return null;
  return typeof e.retryAfter === "number" && e.retryAfter > 0 ? e.retryAfter : 60;
}
