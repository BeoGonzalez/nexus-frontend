"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useMyOrdersQuery } from "@/application/hooks/useOrdersQuery";
import type { OrderResponse } from "@/domain/models";
import { useSession } from "@/presentation/providers/SessionProvider";
import { formatCLP, formatDate, shortId } from "@/presentation/lib/format";
import { OrderStatusBadge } from "@/presentation/components/orders/OrderStatusBadge";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";

const darkPill =
  "inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]";

function itemsSummary(order: OrderResponse): string {
  const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const first = order.items.find((i) => i.product_title)?.product_title;
  const label = `${units} ${units === 1 ? "juego" : "juegos"}`;
  if (!first) return label;
  return order.items.length > 1 ? `${first} y ${order.items.length - 1} más` : first;
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pedidos" className="glass-card divide-y divide-line rounded-lg">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded-xs" />
            <div className="skeleton h-4 w-24 rounded-xs" />
          </div>
          <div className="skeleton h-7 w-24 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

function Frame({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-6 sm:px-8 lg:pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display-wide text-display-2 font-[760] text-ink">Pedidos</h1>
        {count !== undefined && count > 0 && (
          <p className="tabular text-ink-2">
            {count} {count === 1 ? "pedido" : "pedidos"}
          </p>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function OrdersList() {
  const { loggedIn, ready } = useSession();
  const signedIn = ready && loggedIn;
  const query = useMyOrdersQuery(signedIn);

  const orders = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [query.data],
  );

  if (!ready) {
    return (
      <Frame>
        <ListSkeleton />
      </Frame>
    );
  }

  if (!loggedIn) {
    return (
      <Frame>
        <EmptyState
          title="Ingresa para ver tus pedidos"
          detail="Tus compras quedan asociadas a tu cuenta."
          action={
            <Link href="/login?redirect=%2Fpedidos" className={darkPill}>
              Ingresar
            </Link>
          }
        />
      </Frame>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Frame>
        <ErrorState title="No pudimos cargar tus pedidos" onRetry={() => query.refetch()} />
      </Frame>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <Frame>
        <ListSkeleton />
      </Frame>
    );
  }

  if (orders.length === 0) {
    return (
      <Frame>
        <EmptyState
          title="Todavía no tienes pedidos"
          detail="Cuando compres un juego, su boleta y estado aparecerán aquí."
          action={
            <Link href="/catalogo" className={darkPill}>
              Explorar catálogo
            </Link>
          }
        />
      </Frame>
    );
  }

  return (
    <Frame count={orders.length}>
      <ul className="glass-card divide-y divide-line overflow-hidden rounded-lg">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/pedidos/${order.id}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover focus-visible:outline-offset-[-3px] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:gap-x-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  <span className="sr-only">Pedido: </span>
                  {itemsSummary(order)}
                </p>
                <p className="text-sm text-ink-2">
                  <span className="tabular">{formatDate(order.created_at)}</span>
                  <span className="sr-only">, </span>
                  <span className="ml-2 font-mono text-[0.8125rem]">#{shortId(order.id)}</span>
                </p>
              </div>
              <p className="tabular text-right font-semibold text-ink sm:order-none">{formatCLP(order.total_amount_clp)}</p>
              <OrderStatusBadge status={order.status} className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-auto" />
              <ChevronRight
                aria-hidden="true"
                className="hidden size-4 text-ink-3 transition-transform duration-(--dur-1) ease-out-soft group-hover:translate-x-0.5 sm:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
