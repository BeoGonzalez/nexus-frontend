"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { LogOut, Package, ShieldCheck, UserRound } from "lucide-react";
import type { SessionUser } from "@/presentation/providers/SessionProvider";

export function UserMenu({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const name = user.name || user.email || "tu cuenta";
  const initial = name.trim().charAt(0).toUpperCase();
  const isAdmin = user.is_admin || user.role === "admin";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Cuenta de ${name}`}
        className="grid size-11 place-items-center rounded-pill text-ink transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover pointer-fine:size-10"
      >
        <span className="grid size-8 place-items-center rounded-pill bg-surface-pressed text-sm font-semibold">
          {initial || <UserRound aria-hidden="true" className="size-4" />}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="menu-pop glass-raised z-50 min-w-56 rounded-md p-1.5 text-sm text-ink"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="font-medium">{user.name || "Tu cuenta"}</p>
            {user.email && <p className="truncate text-ink-2">{user.email}</p>}
          </div>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className="menu-item">
            <Link href="/pedidos">
              <Package aria-hidden="true" className="size-4 text-ink-2" />
              Mis pedidos
            </Link>
          </DropdownMenu.Item>
          {isAdmin && (
            <DropdownMenu.Item asChild className="menu-item">
              <Link href="/admin">
                <ShieldCheck aria-hidden="true" className="size-4 text-ink-2" />
                Administración
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
          <DropdownMenu.Item className="menu-item" onSelect={onLogout}>
            <LogOut aria-hidden="true" className="size-4 text-ink-2" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
