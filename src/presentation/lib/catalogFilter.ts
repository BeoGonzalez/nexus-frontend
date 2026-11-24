import type { VideoGame } from "@/domain/models";

export type CatalogFilters = { q: string; platforms: string[]; genres: string[] };
export type Facet = { value: string; count: number };

/** Platform name whether the API sends an object or a bare string. */
function platformName(p: VideoGame): string {
  const platform = p.platform as VideoGame["platform"] | string | undefined;
  return typeof platform === "string" ? platform : platform?.name || "";
}

function genreNames(p: VideoGame): string[] {
  const genres = p.genres as Array<{ name: string } | string> | undefined;
  return Array.isArray(genres) ? genres.map((g) => (typeof g === "string" ? g : g.name)) : [];
}

/**
 * Filtering moved unchanged from the former single-page store: title search, platform by
 * case-insensitive inclusion, and genre by substring over description, title, category and genres.
 */
export function filterCatalog(catalog: VideoGame[], f: CatalogFilters): VideoGame[] {
  let filtered = [...catalog];
  if (f.q.trim()) {
    const q = f.q.toLowerCase().trim();
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(q));
  }
  if (f.platforms.length > 0) {
    filtered = filtered.filter((p) => {
      const plat = platformName(p).toUpperCase();
      return f.platforms.some((sp) => plat.includes(sp.toUpperCase()));
    });
  }
  if (f.genres.length > 0) {
    filtered = filtered.filter((p) => {
      const desc = (p.description || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return f.genres.some((sg) => {
        const g = sg.toLowerCase();
        const productGenres = genreNames(p).map((name) => name.toLowerCase());
        return desc.includes(g) || title.includes(g) || cat.includes(g) || productGenres.some((pg) => pg.includes(g));
      });
    });
  }
  return filtered;
}

const byName = (a: string, b: string) => a.localeCompare(b, "es");

/** Facets come only from the catalogue; counts use the same matching as filterCatalog. */
export function deriveFacets(catalog: VideoGame[]): { platforms: Facet[]; genres: Facet[] } {
  const platforms = [...new Set(catalog.map(platformName).filter(Boolean))].sort(byName);
  const genres = [...new Set(catalog.flatMap(genreNames).filter(Boolean))].sort(byName);
  const empty: CatalogFilters = { q: "", platforms: [], genres: [] };
  return {
    platforms: platforms.map((value) => ({
      value,
      count: filterCatalog(catalog, { ...empty, platforms: [value] }).length,
    })),
    genres: genres.map((value) => ({
      value,
      count: filterCatalog(catalog, { ...empty, genres: [value] }).length,
    })),
  };
}

export function parseFilters(sp: URLSearchParams): CatalogFilters {
  return {
    q: (sp.get("q") || "").trim(),
    platforms: sp.getAll("plataforma").filter(Boolean),
    genres: sp.getAll("genero").filter(Boolean),
  };
}

export function filtersToSearch(f: CatalogFilters): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  f.platforms.forEach((p) => sp.append("plataforma", p));
  f.genres.forEach((g) => sp.append("genero", g));
  return sp.toString();
}
