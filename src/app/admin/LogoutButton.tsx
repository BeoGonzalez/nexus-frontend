"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLogout() {
    // OWASP A07: invalidación real en el servidor (borra las cookies HttpOnly de sesión).
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex h-10 w-full items-center gap-3 rounded-xs px-3 text-sm font-medium text-danger transition-colors duration-(--dur-1) ease-out-soft hover:bg-danger/10"
      >
        <LogOut aria-hidden="true" className="size-4" /> Cerrar Sesión
      </button>

      {showConfirm && (
        <div className="sheet-scrim fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className="glass-raised menu-pop w-full max-w-sm rounded-lg p-6 text-ink"
          >
            <h3 id="logout-title" className="text-title font-semibold">
              ¿Cerrar sesión?
            </h3>
            <p id="logout-desc" className="mt-2 text-sm text-ink-2">
              Tendrás que volver a ingresar para entrar al panel de administración.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setShowConfirm(false)}
                className="h-11 flex-1 rounded-pill text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 flex-1 rounded-pill bg-danger text-sm font-semibold text-on-danger hover:bg-danger/90"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
