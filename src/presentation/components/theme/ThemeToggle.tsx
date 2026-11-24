"use client";

import { useEffect, useSyncExternalStore } from "react";
import { RadioGroup } from "radix-ui";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readPreference,
  resolveTheme,
  type ThemePreference,
} from "@/presentation/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
];

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function commit(pref: ThemePreference) {
  const apply = () => applyTheme(resolveTheme(pref, systemPrefersDark()), document.documentElement);
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === "function" && !prefersReducedMotion()) {
    doc.startViewTransition(apply);
  } else {
    apply();
  }
}

const PREF_EVENT = "nexus-theme-pref";

function subscribePref(onChange: () => void) {
  window.addEventListener(PREF_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PREF_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storedPref(): ThemePreference {
  return readPreference(typeof window !== "undefined" ? window.localStorage : null);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore<ThemePreference>(subscribePref, storedPref, () => "system");

  useEffect(() => {
    if (pref !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system", mq.matches), document.documentElement);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [pref]);

  function choose(value: string) {
    const next = value as ThemePreference;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
    window.dispatchEvent(new Event(PREF_EVENT));
    commit(next);
  }

  return (
    <RadioGroup.Root
      aria-label="Tema"
      value={pref}
      onValueChange={choose}
      orientation="horizontal"
      loop
      className={cn("theme-toggle inline-flex items-center rounded-pill p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="theme-toggle__item grid size-11 pointer-fine:size-8 place-items-center rounded-pill text-ink-2 transition-[color,background-color] duration-(--dur-1) ease-out-soft hover:text-ink data-[state=checked]:bg-surface-pressed data-[state=checked]:text-ink"
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
