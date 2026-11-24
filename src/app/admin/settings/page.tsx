import { getSessionUser, isAdminUser } from "@/infrastructure/bff/session";
import { Settings, Save } from "lucide-react";

// OWASP A01: Server Component con autorización propia (ver src/app/admin/page.tsx).
export default async function AdminSettingsPage() {
  if (!isAdminUser(await getSessionUser())) return null;
  return (
    <div className="">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-ink-2 mt-1">Preferencias generales del e-commerce.</p>
        </div>
        <button 
          className="flex items-center gap-2 rounded-sm bg-ink px-6 py-3.5 text-sm font-bold text-bg transition-all hover:bg-ink/85 active:scale-[0.98] opacity-50 cursor-not-allowed"
        >
          <Save size={18} aria-hidden="true" /> Guardar cambios
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xs border border-line surface-solid p-6">
          <div className="mb-6 flex items-center gap-3 text-ink">
            <div className="rounded-xs bg-surface-hover p-2 text-ink-2">
              <Settings size={20} />
            </div>
            <h2 className="text-lg font-bold">Información de la Tienda</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink-2">Nombre de la tienda</label>
              <input 
                defaultValue="Nexus Digital Store"
                disabled
                className="w-full rounded-sm border border-line-strong bg-surface-hover px-4 py-3 text-sm text-ink-2 outline-none cursor-not-allowed" 
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-ink-2">Moneda principal</label>
              <select 
                disabled
                className="w-full rounded-sm border border-line-strong bg-surface-hover px-4 py-3 text-sm text-ink-2 outline-none appearance-none cursor-not-allowed"
              >
                <option>CLP - Peso Chileno</option>
                <option>USD - Dólar Estadounidense</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xs border border-line surface-solid p-6 text-center">
          <p className="max-w-sm text-sm text-ink-2">
            Las opciones de configuración globales estarán habilitadas una vez que finalicemos la integración de las preferencias del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
