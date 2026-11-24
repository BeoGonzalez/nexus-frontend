"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { VideoGame } from "@/domain/models";
import type { Facet } from "@/presentation/lib/catalogFilter";
import { filterCatalog, filtersToSearch } from "@/presentation/lib/catalogFilter";
import { getCoverSrc } from "@/presentation/lib/cover";
import { CoverArt } from "@/presentation/components/catalog/GameCard";

const FAN = 3;

/** One cover of the fan; a cover that fails to load leaves the fan instead of showing an empty card. */
function FanCard({ game, k }: { game: VideoGame; k: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <span
      data-platform-cover=""
      className="platform-fan-card absolute top-1/2 aspect-[3/4] w-[46%] overflow-hidden rounded-md"
      style={{ "--k": k } as CSSProperties}
    >
      <CoverArt game={game} sizes="120px" onBroken={() => setBroken(true)} />
    </span>
  );
}

/** Each platform is shown by its own games: a small fan of real covers, never a placeholder. */
export function PlatformShelf({ platforms, catalog = [] }: { platforms: Facet[]; catalog?: VideoGame[] }) {
  if (platforms.length === 0) return null;
  return (
    <section aria-labelledby="plataformas" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
      <h2 id="plataformas" className="font-display-wide text-display-2 font-[760] text-ink">
        Plataformas
      </h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {platforms.map((p) => {
          const covers = filterCatalog(catalog, { q: "", platforms: [p.value], genres: [] })
            .filter((g) => getCoverSrc(g))
            .slice(0, FAN);
          return (
            <li key={p.value}>
              <Link
                href={`/catalogo?${filtersToSearch({ q: "", platforms: [p.value], genres: [] })}`}
                className="platform-tile glass-card group relative flex min-h-40 overflow-hidden rounded-lg p-6 sm:min-h-52 sm:p-7"
              >
                <span className="relative z-10 flex max-w-[55%] flex-col justify-between gap-6">
                  <span className="text-[0.9375rem] text-ink-2">
                    {p.count} {p.count === 1 ? "juego" : "juegos"}
                  </span>
                  <span className="platform-name font-display-wide font-[780] leading-[0.92] text-ink [overflow-wrap:anywhere]">
                    {p.value}
                  </span>
                </span>
                {covers.length > 0 && (
                  <span aria-hidden="true" className="platform-fan pointer-events-none absolute inset-y-0 right-0 w-[48%]">
                    {covers.map((g, i) => (
                      <FanCard key={g.id} game={g} k={i - (covers.length - 1) / 2} />
                    ))}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
