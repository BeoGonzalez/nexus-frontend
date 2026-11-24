import { Ban, CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import type { OrderStatus } from "@/domain/models";
import { cn } from "@/lib/utils";

const STATUS: Record<OrderStatus, { label: string; Icon: typeof Clock3; tone: string }> = {
  PENDING: { label: "Pendiente", Icon: Clock3, tone: "text-warning" },
  STOCK_CONFIRMED: { label: "Stock confirmado", Icon: PackageCheck, tone: "text-ink-2" },
  PAID: { label: "Pagado", Icon: CheckCircle2, tone: "text-success" },
  DELIVERED: { label: "Entregado", Icon: Truck, tone: "text-success" },
  CANCELLED: { label: "Cancelado", Icon: Ban, tone: "text-danger" },
};

/** Status always reads as text; the icon colour only reinforces it. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus | string; className?: string }) {
  const s = STATUS[status as OrderStatus] ?? { label: status, Icon: Clock3, tone: "text-ink-2" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-surface-hover px-2.5 py-1 text-sm font-medium text-ink",
        className,
      )}
    >
      <s.Icon aria-hidden="true" className={cn("size-4", s.tone)} strokeWidth={2} />
      {s.label}
    </span>
  );
}
