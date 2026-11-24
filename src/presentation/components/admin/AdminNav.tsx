"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { Gamepad2, LayoutDashboard, Menu, Settings, Store, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/games", label: "Juegos & Stock", Icon: Gamepad2 },
  { href: "/admin/users", label: "Usuarios (Cognito)", Icon: Users },
  { href: "/admin/settings", label: "Configuración", Icon: Settings },
];

const itemClass =
  "flex h-10 items-center gap-3 rounded-xs px-3 text-sm font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink aria-[current=page]:bg-surface-pressed aria-[current=page]:text-ink";

function Links({ onNavigate, footer }: { onNavigate?: () => void; footer: ReactNode }) {
  const pathname = usePathname() || "/admin";
  return (
    <>
      <nav aria-label="Administración" className="flex-1 space-y-0.5 p-3">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={itemClass}>
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-line p-3">
        <Link href="/" onClick={onNavigate} className={itemClass}>
          <Store aria-hidden="true" className="size-4" />
          Volver a la Tienda
        </Link>
        {footer}
      </div>
    </>
  );
}

export function AdminWordmark() {
  return (
    <Link href="/admin" className="wordmark font-display-wide rounded-xs text-ink">
      Nexus <span className="font-sans text-sm font-medium tracking-normal text-ink-2">Admin</span>
    </Link>
  );
}

/** Fixed sidebar from md up. */
export function AdminSidebar({ footer }: { footer: ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-bg-elevated md:flex">
      <div className="flex h-14 items-center px-5">
        <AdminWordmark />
      </div>
      <Links footer={footer} />
    </aside>
  );
}

/** Same navigation in a sheet on phones. */
export function AdminMobileNav({ footer }: { footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Abrir navegación"
        className="grid size-11 place-items-center rounded-pill text-ink hover:bg-surface-hover md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim fixed inset-0 z-50" />
        <Dialog.Content
          className={cn("menu-pop glass-raised fixed inset-y-3 left-3 z-50 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col rounded-lg")}
        >
          <div className="flex h-14 items-center justify-between pl-5 pr-2">
            <Dialog.Title asChild>
              <span>
                <AdminWordmark />
              </span>
            </Dialog.Title>
            <Dialog.Close aria-label="Cerrar navegación" className="grid size-11 place-items-center rounded-pill hover:bg-surface-hover">
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Secciones del panel de administración</Dialog.Description>
          <Links onNavigate={() => setOpen(false)} footer={footer} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
