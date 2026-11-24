"use client";

import { RotateCw } from "lucide-react";

export function ErrorState({
  title,
  detail = "No pudimos conectar con la tienda. Revisa tu conexión e intenta de nuevo.",
  onRetry,
}: {
  title: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="glass-card mx-auto flex max-w-md flex-col items-start gap-3 rounded-lg p-6">
      <h2 className="text-title font-semibold text-ink">{title}</h2>
      <p className="text-ink-2">{detail}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
      >
        <RotateCw aria-hidden="true" className="size-4" />
        Reintentar
      </button>
    </div>
  );
}
