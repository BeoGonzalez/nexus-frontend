"use client";

import { useSyncExternalStore } from "react";
import type { ResolvedTheme } from "@/presentation/lib/theme";

function current(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme actually applied to <html>, kept in sync with the toggle and the OS. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

/** Reads design tokens (CSS custom properties) for canvases that cannot use CSS directly. */
export function readTokens<T extends string>(names: readonly T[]): Record<T, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])) as Record<T, string>;
}
