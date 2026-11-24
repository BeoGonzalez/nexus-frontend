"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useCartQuery, useUpdateCartItemMutation } from "@/application/hooks/useCartQuery";
import { useCartUI } from "@/presentation/providers/CartUIProvider";
import { cartTotals, toCartLines } from "@/presentation/lib/cartLines";
import { formatCLP } from "@/presentation/lib/format";
import { CartLineItem } from "@/presentation/components/cart/CartLineItem";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";

function LinesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando carrito" className="space-y-4 py-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton aspect-[3/4] w-16 rounded-sm" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-4 w-3/4 rounded-xs" />
            <div className="skeleton h-4 w-1/3 rounded-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartDrawer() {
  const { open, setOpen, getCartTarget } = useCartUI();
  const cart = useCartQuery();
  const update = useUpdateCartItemMutation();
  const lines = useMemo(() => toCartLines(cart.data), [cart.data]);
  const { count, total } = cartTotals(lines);
  const close = () => setOpen(false);

  let body;
  if (cart.isError && !cart.data) {
    body = (
      <div className="py-6">
        <ErrorState title="No pudimos cargar tu carrito" onRetry={() => cart.refetch()} />
      </div>
    );
  } else if (cart.isLoading && !cart.data) {
    body = <LinesSkeleton />;
  } else if (lines.length === 0) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-title font-semibold text-ink">Tu carrito está vacío</p>
        <p className="max-w-[28ch] text-ink-2">Lo que añadas desde el catálogo aparecerá aquí.</p>
        <Link
          href="/catalogo"
          onClick={close}
          className="mt-2 inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        <ul className="-mx-1 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-1">
          {lines.map((line) => (
            <CartLineItem
              key={line.cartId}
              line={line}
              busy={update.isPending}
              onQuantity={(productId, quantity) => update.mutate({ productId, quantity })}
              onNavigate={close}
            />
          ))}
        </ul>
        <div className="border-t border-line pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-2">Total</span>
            <span className="tabular font-display text-price font-bold text-ink">{formatCLP(total)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={close}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-pill bg-buy px-7 text-[0.9375rem] font-semibold text-on-buy transition-[background-color,transform] duration-(--dur-1) ease-out-soft hover:bg-buy-hover active:scale-[0.98]"
          >
            Ir a pagar
          </Link>
        </div>
      </>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim fixed inset-0 z-50" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            const target = getCartTarget();
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className="cart-sheet glass-raised fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-ink sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[26rem] sm:rounded-xl sm:px-6 sm:pt-5"
        >
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-pill bg-line-strong sm:hidden" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display-wide text-title font-[760]">Carrito</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar carrito"
              className="-mr-2 grid size-11 place-items-center rounded-pill text-ink-2 hover:bg-surface-hover hover:text-ink"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="tabular text-sm text-ink-2">
            {count === 0 ? "Sin productos" : `${count} ${count === 1 ? "producto" : "productos"}`}
          </Dialog.Description>
          <div className="mt-2 flex min-h-0 flex-1 flex-col">{body}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
