import type { ReactNode } from "react";

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-title font-semibold text-ink">{title}</p>
      {detail && <p className="text-ink-2">{detail}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
