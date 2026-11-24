import React, { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminUser } from "@/infrastructure/bff/session";
import LogoutButton from "./LogoutButton";
import AdminGuard from "./AdminGuard";
import { AdminMobileNav, AdminSidebar } from "@/presentation/components/admin/AdminNav";
import { ThemeToggle } from "@/presentation/components/theme/ThemeToggle";

export const metadata = {
  title: "Administración",
  description: "Panel de administración de Nexus Digital Store",
  robots: { index: false },
};

/** Operate surface: opaque, dense, no chromatic backdrop. Glass only on the top bar and on dialogs. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // OWASP A01: autorización en el servidor en cada render del panel (no solo en src/proxy.ts).
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=%2Fadmin");
  const allowed = isAdminUser(user);

  return (
    <AdminGuard allowed={allowed} email={user.email}>
      <div className="flex min-h-dvh bg-bg text-ink">
        <AdminSidebar footer={<LogoutButton />} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-chrome sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 px-3 sm:px-6">
            <div className="flex items-center gap-1">
              <AdminMobileNav footer={<LogoutButton />} />
              <p className="text-sm font-medium text-ink-2">Panel de administración</p>
            </div>
            <ThemeToggle />
          </header>
          <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
