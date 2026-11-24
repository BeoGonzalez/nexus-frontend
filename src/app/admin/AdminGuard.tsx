import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert, Store, LogIn } from "lucide-react";

/**
 * Pantalla de acceso del panel admin.
 *
 * OWASP A01: la decisión `allowed` la toma el layout EN EL SERVIDOR (DAL → microservicio de auth,
 * que valida el JWT de Cognito). Aquí no hay lógica de autorización ni atajos de desarrollo:
 * el antiguo "Simular Rol Admin" (flag en localStorage) se eliminó.
 */
export default function AdminGuard({
  allowed,
  email,
  children,
}: {
  allowed: boolean;
  email?: string | null;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-ink text-center">
      <div className="w-full max-w-md rounded-xs border border-danger/30 surface-solid p-8 shadow-lg">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-md bg-danger/10 text-danger border border-danger/30">
          <ShieldAlert size={36} />
        </div>

        <h2 className="text-2xl font-bold text-ink">Acceso Restringido</h2>
        <span className="inline-block mt-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold font-mono text-danger border border-danger/30">
          HTTP 403 FORBIDDEN · ROL ADMIN REQUERIDO
        </span>

        <p className="mt-4 text-sm text-ink-2 leading-relaxed">
          Esta interfaz está reservada exclusivamente para cuentas con rol de{" "}
          <strong className="text-ink">Administrador</strong>.
        </p>

        <div className="mt-4 rounded-sm bg-surface-hover border border-line p-3 text-xs text-ink-2 font-mono">
          {email ? (
            <>
              Sesión activa: <span className="text-ink">{email}</span> (Rol: Usuario Estándar)
            </>
          ) : (
            "No se detectó ninguna sesión activa de administrador."
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login?redirect=%2Fadmin"
            className="flex items-center justify-center gap-2 rounded-sm bg-ink py-3 text-sm font-bold text-bg transition-all hover:opacity-90"
          >
            <LogIn size={18} /> Iniciar sesión con una cuenta administradora
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-sm bg-surface-hover border border-line-strong py-3 text-sm font-bold text-ink transition-all hover:bg-surface-pressed hover:text-ink"
          >
            <Store size={18} /> Volver a la Tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
