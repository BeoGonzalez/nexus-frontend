"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type BackdropFocus = { focus: string | null; setFocus: (src: string | null) => void };

const BackdropFocusContext = createContext<BackdropFocus | null>(null);

/** Which cover lights the page. null = neutral field. */
export function BackdropFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<string | null>(null);
  const value = useMemo(() => ({ focus, setFocus }), [focus]);
  return <BackdropFocusContext.Provider value={value}>{children}</BackdropFocusContext.Provider>;
}

export function useBackdropFocus(): BackdropFocus {
  const ctx = useContext(BackdropFocusContext);
  if (!ctx) throw new Error("useBackdropFocus must be used inside <BackdropFocusProvider>");
  return ctx;
}
