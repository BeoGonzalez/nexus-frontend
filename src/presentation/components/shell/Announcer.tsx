"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

type Announce = (message: string) => void;

const AnnounceContext = createContext<Announce | null>(null);

/**
 * One polite live region for the whole store plus a short visual confirmation.
 * The toast is the only transient glass layer and never stacks.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback<Announce>((next) => {
    setMessage("");
    // Re-set on the next frame so identical consecutive messages are re-announced.
    requestAnimationFrame(() => setMessage(next));
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
      <div
        aria-hidden="true"
        data-visible={visible || undefined}
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[45] flex justify-center px-4"
      >
        <p data-visible={visible || undefined} className="toast glass-chrome inline-flex min-w-0 max-w-full items-center gap-2 sm:max-w-md rounded-pill px-4 py-2.5 text-sm font-medium text-ink">
          <Check aria-hidden="true" className="size-4 shrink-0 text-success" strokeWidth={2.25} />
          <span className="min-w-0 truncate">{message}</span>
        </p>
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const ctx = useContext(AnnounceContext);
  if (!ctx) throw new Error("useAnnounce must be used inside <AnnouncerProvider>");
  return ctx;
}
