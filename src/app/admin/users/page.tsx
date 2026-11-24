import { getSessionUser, isAdminUser } from "@/infrastructure/bff/session";
import { Users, Search } from "lucide-react";

// OWASP A01: Server Component con autorización propia (ver src/app/admin/page.tsx).
export default async function AdminUsersPage() {
  if (!isAdminUser(await getSessionUser())) return null;
  return (
    <div className="">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-ink-2 mt-1">Gestiona las cuentas de clientes y administradores.</p>
        </div>
      </div>

      <div className="mb-6 flex max-w-md items-center rounded-sm border border-line-strong bg-surface-hover px-4 py-3">
        <Search className="mr-3 shrink-0 text-ink-2" size={18} />
        <input
          placeholder="Buscar por email o nombre..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
        />
      </div>

      <div className="flex h-64 flex-col items-center justify-center rounded-xs border border-line surface-solid text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-hover text-ink-2">
          <Users size={32} />
        </div>
        <h3 className="text-lg font-bold text-ink">Módulo en Construcción</h3>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          La gestión de usuarios mediante Amazon Cognito estará disponible en una próxima actualización.
        </p>
      </div>
    </div>
  );
}
