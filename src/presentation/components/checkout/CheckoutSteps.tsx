import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHECKOUT_STEPS = ["Datos", "Pago", "Procesando", "Recibo"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const currentIndex = CHECKOUT_STEPS.indexOf(current);
  return (
    <ol aria-label="Pasos del pago" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 font-medium",
              active ? "text-ink" : done ? "text-ink-2" : "text-ink-3",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "tabular grid size-6 place-items-center rounded-pill text-xs font-semibold transition-colors duration-(--dur-2) ease-out-soft",
                active && "bg-ink text-bg",
                done && "bg-surface-pressed text-ink",
                !active && !done && "ring-1 ring-line-strong ring-inset",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={active ? undefined : "sr-only sm:not-sr-only"}>{label}</span>
            {done && <span className="sr-only">(completado)</span>}
            {i < CHECKOUT_STEPS.length - 1 && <span aria-hidden="true" className="ml-1 h-px w-4 bg-line-strong sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
