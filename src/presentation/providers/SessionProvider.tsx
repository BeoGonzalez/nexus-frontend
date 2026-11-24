"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { logoutRequest } from "@/application/hooks/useAuthMutations";

export type SessionUser = { name?: string; email?: string; role?: string; is_admin?: boolean };

type SessionValue = {
  user: SessionUser | null;
  loggedIn: boolean;
  /** True once the session has been resolved against the BFF; before that `loggedIn` is unknown. */
  ready: boolean;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

function toSessionUser(data: unknown): SessionUser | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    name: str(d.name),
    email: str(d.email),
    role: str(d.role),
    is_admin: d.is_admin === true,
  };
}

/**
 * Sesión del navegador (OWASP A04/A07).
 * El JWT vive en una cookie HttpOnly que JavaScript no puede leer: la sesión se resuelve preguntando
 * al BFF (/api/v1/auth/me) y el logout se invalida en el servidor.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Limpieza de tokens heredados de versiones anteriores (antes se guardaban en localStorage).
    try {
      ["nexus_token", "nexus_refresh_token", "nexus_id_token", "nexus_dev_admin_active"].forEach((k) =>
        localStorage.removeItem(k)
      );
    } catch {
      /* almacenamiento no disponible */
    }

    fetch("/api/v1/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(toSessionUser(data));
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await logoutRequest();
  }, []);

  const value = useMemo(() => ({ user, loggedIn: !!user, ready, logout }), [user, ready, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
