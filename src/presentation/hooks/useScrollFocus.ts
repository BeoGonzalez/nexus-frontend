"use client";

import { useEffect, type RefObject } from "react";

/**
 * The backdrop follows the cover the visitor is looking at: any element with data-cover that
 * crosses the middle band of the viewport becomes the light source. Changes settle for a moment
 * first so a fast scroll doesn't queue crossfades.
 */
export function useScrollFocus(rootRef: RefObject<HTMLElement | null>, setFocus: (src: string | null) => void, deps: unknown[]) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        const src = hit ? (hit.target as HTMLElement).dataset.cover : undefined;
        if (!src) return;
        clearTimeout(timer);
        timer = setTimeout(() => setFocus(src), 180);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    root.querySelectorAll<HTMLElement>("[data-cover]").forEach((el) => io.observe(el));
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, setFocus, ...deps]);
}
