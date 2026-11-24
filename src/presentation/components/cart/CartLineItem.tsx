"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartLine } from "@/presentation/lib/cartLines";
import { formatCLP } from "@/presentation/lib/format";
import { CoverArt } from "@/presentation/components/catalog/GameCard";

const stepButton =
  "grid size-11 place-items-center rounded-pill text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink aria-disabled:opacity-40 pointer-fine:size-8";

export function CartLineItem({
  line,
  busy,
  onQuantity,
  onNavigate,
}: {
  line: CartLine;
  busy: boolean;
  onQuantity: (productId: string, quantity: number) => void;
  onNavigate: () => void;
}) {
  const lineTotal = (line.price_clp || 0) * line.quantity;

  return (
    <li className="flex gap-4 py-4">
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-sm">
        <CoverArt game={line} sizes="64px" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/juego/${line.id}`}
            onClick={onNavigate}
            className="line-clamp-2 rounded-xs font-medium leading-snug text-ink hover:underline hover:underline-offset-4"
          >
            {line.title}
          </Link>
          <p className="tabular shrink-0 font-semibold text-ink">{formatCLP(lineTotal)}</p>
        </div>
        {line.quantity > 1 && (
          <p className="tabular -mt-1 text-sm text-ink-2">{formatCLP(line.price_clp || 0)} c/u</p>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-0.5 rounded-pill ring-1 ring-line ring-inset">
            <button
              type="button"
              aria-disabled={busy || undefined}
              aria-label={`Quitar una unidad de ${line.title}`}
              onClick={() => !busy && onQuantity(line.cartId, Math.max(0, line.quantity - 1))}
              className={stepButton}
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </button>
            <span className="tabular w-7 text-center text-sm font-semibold text-ink" aria-label={`Cantidad: ${line.quantity}`}>
              {line.quantity}
            </span>
            <button
              type="button"
              aria-disabled={busy || undefined}
              aria-label={`Añadir una unidad de ${line.title}`}
              onClick={() => !busy && onQuantity(line.cartId, line.quantity + 1)}
              className={stepButton}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-disabled={busy || undefined}
            aria-label={`Quitar ${line.title}`}
            onClick={() => !busy && onQuantity(line.cartId, 0)}
            className="grid size-11 place-items-center rounded-pill text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-danger aria-disabled:opacity-40 pointer-fine:size-9"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
