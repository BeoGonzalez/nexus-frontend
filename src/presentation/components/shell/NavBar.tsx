"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCartQuery } from "@/application/hooks/useCartQuery";
import { useSession } from "@/presentation/providers/SessionProvider";
import { useCartUI } from "@/presentation/providers/CartUIProvider";
import { ThemeToggle } from "@/presentation/components/theme/ThemeToggle";
import { UserMenu } from "@/presentation/components/shell/UserMenu";

const LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/pedidos", label: "Pedidos" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`wordmark font-display-wide rounded-xs px-1 text-ink ${className}`}>
      Nexus
    </Link>
  );
}

function CartButton() {
  const { data } = useCartQuery();
  const { setOpen, registerCartTarget, bumpKey } = useCartUI();
  const count = (data?.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const label = `Carrito, ${count} ${count === 1 ? "producto" : "productos"}`;
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerCartTarget(ref.current);
    return () => registerCartTarget(null);
  }, [registerCartTarget]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={() => setOpen(true)}
      className="relative grid size-11 place-items-center rounded-pill text-ink transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover pointer-fine:size-10"
    >
      <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.75} />
      {count > 0 && (
        <span
          key={bumpKey}
          aria-hidden="true"
          data-bumped={bumpKey > 0 || undefined}
          className="cart-count tabular absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-pill bg-buy px-1 text-xs font-semibold leading-none text-on-buy"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="rounded-pill px-3.5 py-2 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:text-ink aria-[current=page]:bg-surface-pressed aria-[current=page]:text-ink"
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function NavBar() {
  const pathname = usePathname() || "/";
  const { user, loggedIn, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4" style={{ viewTransitionName: "site-header" }}>
      <div className="glass-chrome mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-pill pl-4 pr-1.5 sm:pl-5">
        <Wordmark />

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-0.5 sm:flex">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="hidden md:inline-flex" />
          {loggedIn && user ? (
            <span className="hidden sm:block">
              <UserMenu user={user} onLogout={logout} />
            </span>
          ) : (
            <Link
              href={loginHref}
              className="hidden rounded-pill px-3.5 py-2 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:text-ink sm:inline-block"
            >
              Ingresar
            </Link>
          )}
          <CartButton />

          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger
              aria-label="Abrir menú"
              className="grid size-11 place-items-center rounded-pill text-ink hover:bg-surface-hover md:hidden"
            >
              <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="sheet-scrim fixed inset-0 z-50" />
              <Dialog.Content className="menu-pop glass-raised fixed inset-x-3 top-3 z-50 rounded-xl p-3 text-ink">
                <div className="flex items-center justify-between pl-2">
                  <Dialog.Title className="wordmark font-display-wide">Nexus</Dialog.Title>
                  <Dialog.Close aria-label="Cerrar menú" className="grid size-11 place-items-center rounded-pill hover:bg-surface-hover">
                    <X aria-hidden="true" className="size-5" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">Navegación de la tienda</Dialog.Description>
                <nav aria-label="Menú móvil" className="mt-2 flex flex-col gap-1 [&>a]:py-3 [&>a]:text-base">
                  <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                  {loggedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="rounded-pill px-3.5 py-3 text-left text-base font-medium text-ink-2 hover:text-ink"
                    >
                      Cerrar sesión
                    </button>
                  ) : (
                    <Link href={loginHref} onClick={() => setMenuOpen(false)} className="rounded-pill px-3.5 font-medium text-ink-2 hover:text-ink">
                      Ingresar
                    </Link>
                  )}
                </nav>
                <div className="mt-3 flex items-center justify-between border-t border-line px-2 pt-3">
                  <span className="text-sm text-ink-2">Tema</span>
                  <ThemeToggle />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
