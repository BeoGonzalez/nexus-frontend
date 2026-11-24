"use client";

import Link from "next/link";
import { ChevronLeft, RotateCw } from "lucide-react";
import { useOrderByIdQuery } from "@/application/hooks/useOrdersQuery";
import { useSession } from "@/presentation/providers/SessionProvider";
import { formatCLP, formatDateTime, shortId } from "@/presentation/lib/format";
import { OrderStatusBadge } from "@/presentation/components/orders/OrderStatusBadge";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";

const backLink =
  "inline-flex h-11 items-center gap-1 rounded-pill pl-2 pr-4 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-6 sm:px-8 lg:pt-10">
      <nav aria-label="Ruta de navegación">
        <Link href="/pedidos" className={backLink}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Pedidos
        </Link>
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pedido" className="space-y-4">
      <div className="skeleton h-12 w-2/3 rounded-sm" />
      <div className="skeleton h-72 w-full rounded-lg" />
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const { loggedIn, ready } = useSession();
  const query = useOrderByIdQuery(ready && loggedIn ? id : undefined);
  const order = query.data;

  if (!ready || (loggedIn && query.isLoading && !order)) {
    return (
      <Frame>
        <DetailSkeleton />
      </Frame>
    );
  }

  if (!loggedIn) {
    return (
      <Frame>
        <EmptyState
          title="Ingresa para ver este pedido"
          action={
            <Link
              href={`/login?redirect=${encodeURIComponent(`/pedidos/${id}`)}`}
              className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg"
            >
              Ingresar
            </Link>
          }
        />
      </Frame>
    );
  }

  if (query.isError || !order) {
    return (
      <Frame>
        <EmptyState
          title="No pudimos abrir este pedido"
          detail="Puede que no exista, que pertenezca a otra cuenta o que el servicio no responda."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/pedidos"
                className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
              >
                Volver a pedidos
              </Link>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="inline-flex h-11 items-center gap-2 rounded-pill px-5 text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-hover"
              >
                <RotateCw aria-hidden="true" className="size-4" />
                Reintentar
              </button>
            </div>
          }
        />
      </Frame>
    );
  }

  const units = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Frame>
      <title>{`Pedido ${shortId(order.id)} | Nexus Digital Store`}</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display-wide text-display-2 font-[760] text-ink">
            Pedido <span className="font-mono text-[0.8em] font-semibold tracking-normal">#{shortId(order.id)}</span>
          </h1>
          <p className="tabular mt-2 text-ink-2">{formatDateTime(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section aria-label="Detalle del pedido" className="glass-raised mt-8 rounded-lg p-5 sm:p-7">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.product_id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0">
              <div className="min-w-0">
                {item.product_title ? (
                  <Link href={`/juego/${item.product_id}`} className="font-medium text-ink hover:underline hover:underline-offset-4">
                    {item.product_title}
                  </Link>
                ) : (
                  <span className="[overflow-wrap:anywhere] font-mono text-sm text-ink">{item.product_id}</span>
                )}
                <p className="tabular text-sm text-ink-2">
                  {item.quantity} × {formatCLP(item.unit_price_clp)}
                </p>
              </div>
              <p className="tabular shrink-0 font-semibold text-ink">{formatCLP(item.subtotal_clp)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-ink-2">
            Total <span className="tabular">({units} {units === 1 ? "juego" : "juegos"})</span>
          </span>
          <span className="tabular font-display text-price font-bold text-ink">{formatCLP(order.total_amount_clp)}</span>
        </div>
        {order.user_email && (
          <p className="mt-4 text-sm text-ink-2">
            Boleta y claves enviadas a <span className="[overflow-wrap:anywhere] text-ink">{order.user_email}</span>
          </p>
        )}
      </section>

      <p className="mt-6 [overflow-wrap:anywhere] font-mono text-[0.8125rem] text-ink-2">ID completo: {order.id}</p>
    </Frame>
  );
}
