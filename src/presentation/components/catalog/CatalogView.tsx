"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useVideoGamesQuery } from "@/application/hooks/useVideoGamesQuery";
import { useAddToCart } from "@/presentation/hooks/useAddToCart";
import { useHydrated } from "@/presentation/hooks/useHydrated";
import { useBackdropFocus } from "@/presentation/providers/BackdropFocusProvider";
import {
  deriveFacets,
  filterCatalog,
  filtersToSearch,
  parseFilters,
  type CatalogFilters,
} from "@/presentation/lib/catalogFilter";
import { GameCard } from "@/presentation/components/catalog/GameCard";
import { GameCardSkeleton } from "@/presentation/components/catalog/GameCardSkeleton";
import { CatalogFiltersBar } from "@/presentation/components/catalog/CatalogFiltersBar";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Cards stagger in on the first visit of the session only; coming back shows them settled. */
let catalogArrived = false;

export function CatalogView() {
  const router = useRouter();
  const pathname = usePathname() || "/catalogo";
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const query = useVideoGamesQuery();
  const hydrated = useHydrated();
  const { refetch } = query;
  const data = hydrated ? query.data : undefined;
  const isLoading = !hydrated || query.isLoading;
  // A failed background refetch keeps what is already on screen.
  const isError = hydrated && query.isError && !query.data;
  const catalog = useMemo(() => data ?? [], [data]);
  const facets = useMemo(() => deriveFacets(catalog), [catalog]);
  const results = useMemo(() => filterCatalog(catalog, filters), [catalog, filters]);
  const addToCart = useAddToCart();
  const { setFocus } = useBackdropFocus();

  const [draftQuery, setDraftQuery] = useState(filters.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Cards stagger in only on arrival; once the visitor filters, the grid just cross-fades.
  const [userFiltered, setUserFiltered] = useState(false);
  const [firstVisit] = useState(() => !catalogArrived);
  useEffect(() => {
    catalogArrived = true;
  }, []);
  const staggered = firstVisit && !userFiltered;
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q);
    if (draftQuery.trim() !== filters.q) setDraftQuery(filters.q);
  }

  useEffect(() => setFocus(null), [setFocus]);

  const commit = useCallback(
    (next: CatalogFilters) => {
      setUserFiltered(true);
      const qs = filtersToSearch(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Search writes to the URL after a short pause in typing.
  useEffect(() => {
    if (draftQuery.trim() === filters.q) return;
    const t = setTimeout(() => commit({ ...filters, q: draftQuery }), 300);
    return () => clearTimeout(t);
  }, [draftQuery, filters, commit]);

  // "/" focuses search, as before the redesign.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeCount = filters.platforms.length + filters.genres.length;
  const clearAll = () => {
    setDraftQuery("");
    commit({ q: "", platforms: [], genres: [] });
  };

  const filterPanel = (
    <CatalogFiltersBar
      platforms={facets.platforms}
      genres={facets.genres}
      selectedPlatforms={filters.platforms}
      selectedGenres={filters.genres}
      onTogglePlatform={(v) => commit({ ...filters, platforms: toggle(filters.platforms, v) })}
      onToggleGenre={(v) => commit({ ...filters, genres: toggle(filters.genres, v) })}
      onClear={() => commit({ ...filters, platforms: [], genres: [] })}
      activeCount={activeCount}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="font-display-wide text-display-2 font-[760] text-ink">Catálogo</h1>
          <p role="status" className="mt-2 text-ink-2">
            {isLoading ? "Cargando juegos" : `${results.length} ${results.length === 1 ? "juego" : "juegos"}`}
          </p>
        </div>

        <form
          role="search"
          className="w-full sm:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            commit({ ...filters, q: draftQuery });
          }}
        >
          <label htmlFor="catalog-search" className="sr-only">
            Buscar juegos
          </label>
          <div className="search-field glass-card relative flex h-12 items-center rounded-pill">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 size-4 text-ink-2" />
            <input
              ref={searchRef}
              id="catalog-search"
              type="search"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Buscar por título"
              autoComplete="off"
              className="h-full w-full rounded-pill bg-transparent pl-11 pr-12 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-4 hidden rounded-xs px-1.5 font-mono text-xs text-ink-3 ring-1 ring-line-strong pointer-fine:block">
              /
            </kbd>
          </div>
        </form>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-10">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <h2 className="sr-only">Resultados</h2>
          <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
            <Dialog.Trigger className="glass-card mb-5 inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold text-ink lg:hidden">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="sheet-scrim fixed inset-0 z-50" />
              <Dialog.Content className="sheet-bottom glass-raised fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-xl px-5 pb-8 pt-4 text-ink">
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="text-title font-semibold">Filtros</Dialog.Title>
                  <Dialog.Close aria-label="Cerrar filtros" className="grid size-11 place-items-center rounded-pill hover:bg-surface-hover">
                    <X aria-hidden="true" className="size-5" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">Filtra el catálogo por plataforma y género</Dialog.Description>
                {filterPanel}
                <Dialog.Close className="mt-6 h-12 w-full rounded-pill bg-ink text-[0.9375rem] font-semibold text-bg">
                  Ver {results.length} {results.length === 1 ? "juego" : "juegos"}
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {isError ? (
            <div className="py-16">
              <ErrorState title="No pudimos cargar el catálogo" onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <ul aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i}>
                  <GameCardSkeleton />
                </li>
              ))}
            </ul>
          ) : catalog.length === 0 ? (
            <EmptyState title="Aún no hay juegos en el catálogo" detail="Cuando la tienda publique títulos, aparecerán aquí." />
          ) : results.length === 0 ? (
            <EmptyState
              title="Ningún juego coincide con estos filtros"
              detail="Prueba con otra plataforma o género, o busca por otro título."
              action={
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-bg"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4"
            >
              {results.map((game, i) => (
                <li key={game.id}>
                  <GameCard game={game} index={staggered ? i : undefined} onAdd={addToCart} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
