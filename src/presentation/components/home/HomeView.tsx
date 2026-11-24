"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useVideoGamesQuery } from "@/application/hooks/useVideoGamesQuery";
import { useBackdropFocus } from "@/presentation/providers/BackdropFocusProvider";
import { useAddToCart } from "@/presentation/hooks/useAddToCart";
import { useHydrated } from "@/presentation/hooks/useHydrated";
import { useScrollFocus } from "@/presentation/hooks/useScrollFocus";
import { pickFeatured } from "@/presentation/lib/featured";
import { getCoverSrc } from "@/presentation/lib/cover";
import { deriveFacets } from "@/presentation/lib/catalogFilter";
import { HeroFeatured, HeroSkeleton } from "@/presentation/components/home/HeroFeatured";
import { PlatformShelf } from "@/presentation/components/home/PlatformShelf";
import { GameCard } from "@/presentation/components/catalog/GameCard";
import { GameCardSkeleton } from "@/presentation/components/catalog/GameCardSkeleton";
import { RecommendationSection } from "@/presentation/components/catalog/RecommendationSection";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";

const SHELF_SIZE = 8;

export function HomeView() {
  const query = useVideoGamesQuery();
  const hydrated = useHydrated();
  const { refetch } = query;
  const data = hydrated ? query.data : undefined;
  const isLoading = !hydrated || query.isLoading;
  const isError = hydrated && query.isError && !query.data;
  const catalog = useMemo(() => data ?? [], [data]);
  const featured = useMemo(() => pickFeatured(catalog), [catalog]);
  const facets = useMemo(() => deriveFacets(catalog), [catalog]);
  const { setFocus } = useBackdropFocus();
  const addToCart = useAddToCart();
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollFocus(pageRef, setFocus, [catalog, isLoading, isError]);

  useEffect(() => {
    setFocus(featured ? getCoverSrc(featured) : null);
    return () => setFocus(null);
  }, [featured, setFocus]);

  if (isError) {
    return (
      <div className="px-5 py-24">
        <ErrorState title="No pudimos cargar el catálogo" onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Cargando la tienda">
        <HeroSkeleton />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 sm:px-8 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="px-5 py-24">
        <EmptyState
          title="Aún no hay juegos en el catálogo"
          detail="Cuando la tienda publique títulos, aparecerán aquí."
        />
      </div>
    );
  }

  // The hero already shows the featured cover; repeating it would duplicate its transition name.
  // Games without a cover would only show the fallback field; the full count stays on the link below.
  const shelf = catalog.filter((g) => g.id !== featured.id && getCoverSrc(g)).slice(0, SHELF_SIZE);

  return (
    <div ref={pageRef}>
      <HeroFeatured game={featured} onAdd={addToCart} />

      {shelf.length > 0 && (
        <section aria-labelledby="en-catalogo" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="en-catalogo" className="font-display-wide text-display-2 font-[760] text-ink">
              En el catálogo
            </h2>
            <Link
              href="/catalogo"
              className="rounded-pill px-4 py-2.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover"
            >
              Ver los {catalog.length} juegos
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {shelf.map((game, i) => (
              <li key={game.id}>
                <GameCard game={game} index={i} onAdd={addToCart} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlatformShelf platforms={facets.platforms} catalog={catalog} />

      {/* Recommendations come from a separate service and may reference titles outside the catalogue. */}
      <RecommendationSection catalog={catalog} excludeId={featured.id} onAddToCart={addToCart} />
    </div>
  );
}
