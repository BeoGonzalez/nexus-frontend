import type { VideoGame } from "@/domain/models";

/**
 * The game that lights the home page: the newest by created_at, or the first the API returns
 * when no dates exist. There is no "featured" flag in the data and none is invented.
 */
export function pickFeatured(catalog: VideoGame[]): VideoGame | null {
  if (catalog.length === 0) return null;
  // The hero is the page's light source: a game without a cover can't lead it while one with a cover exists.
  const withCover = catalog.filter((g) => g.image_url || g.image);
  if (withCover.length > 0 && withCover.length < catalog.length) return pickFeatured(withCover);
  const dated = catalog.filter((g) => g.created_at && !Number.isNaN(Date.parse(g.created_at)));
  if (dated.length === 0) return catalog[0];
  return dated.reduce((a, b) => (Date.parse(b.created_at!) > Date.parse(a.created_at!) ? b : a));
}
