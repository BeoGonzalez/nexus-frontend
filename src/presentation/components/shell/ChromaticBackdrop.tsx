"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useBackdropFocus } from "@/presentation/providers/BackdropFocusProvider";
import { canOptimize } from "@/presentation/lib/cover";

type Layer = { src: string; key: number; leaving?: boolean };

const LEAVE_MS = 900; // matches --dur-hero

/**
 * The page's only source of colour: the cover in focus, scaled up and blurred with `filter`
 * (a static layer, never backdrop-filter), under a tint that keeps text on glass legible.
 */
export function ChromaticBackdrop() {
  const { focus } = useBackdropFocus();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const seq = useRef(0);

  useEffect(() => {
    setLayers((prev) => {
      const current = prev.find((l) => !l.leaving);
      if (current?.src === focus) return prev;
      const leaving = prev.filter((l) => !l.leaving).map((l) => ({ ...l, leaving: true }));
      const next = focus ? [{ src: focus, key: ++seq.current }] : [];
      return [...leaving, ...next].slice(-3);
    });
    const t = setTimeout(() => setLayers((prev) => prev.filter((l) => !l.leaving)), LEAVE_MS);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <div
      aria-hidden="true"
      className="chromatic-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ viewTransitionName: "site-backdrop" }}
    >
      <div data-testid="backdrop-fallback" className="chromatic-field absolute inset-0" />
      {layers
        .filter((l) => !broken.has(l.src))
        .map((l) => (
          <div key={l.key} className="chromatic-layer absolute" data-leaving={l.leaving || undefined}>
            <Image
              src={l.src}
              alt=""
              fill
              sizes="96px"
              unoptimized={!canOptimize(l.src)}
              className="object-cover"
              onError={() => setBroken((b) => new Set(b).add(l.src))}
            />
          </div>
        ))}
      <div className="chromatic-tint absolute inset-0" />
    </div>
  );
}
