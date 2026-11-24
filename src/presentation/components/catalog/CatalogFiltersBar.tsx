"use client";

import type { Facet } from "@/presentation/lib/catalogFilter";

function FacetGroup({
  legend,
  facets,
  selected,
  onToggle,
}: {
  legend: string;
  facets: Facet[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (facets.length === 0) return null;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <ul className="flex flex-col">
        {facets.map((f) => {
          const checked = selected.includes(f.value);
          return (
            <li key={f.value}>
              <label className="facet-option flex min-h-11 cursor-pointer items-center gap-3 rounded-xs px-2 text-[0.9375rem] text-ink-2 hover:bg-surface-hover hover:text-ink has-[:checked]:text-ink pointer-fine:min-h-9">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(f.value)}
                  className="facet-check"
                />
                <span className="min-w-0 flex-1 truncate">{f.value}</span>
                <span className="tabular text-sm text-ink-3">{f.count}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function CatalogFiltersBar({
  platforms,
  genres,
  selectedPlatforms,
  selectedGenres,
  onTogglePlatform,
  onToggleGenre,
  onClear,
  activeCount,
}: {
  platforms: Facet[];
  genres: Facet[];
  selectedPlatforms: string[];
  selectedGenres: string[];
  onTogglePlatform: (value: string) => void;
  onToggleGenre: (value: string) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <FacetGroup legend="Plataforma" facets={platforms} selected={selectedPlatforms} onToggle={onTogglePlatform} />
      <FacetGroup legend="Género" facets={genres} selected={selectedGenres} onToggle={onToggleGenre} />
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="self-start rounded-pill px-3 py-2 text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
