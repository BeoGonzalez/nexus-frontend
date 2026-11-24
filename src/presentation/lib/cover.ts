import type { VideoGame } from "@/domain/models";
import { optimizableHosts } from "@/presentation/lib/imageHosts";

/** First available cover URL of a game, or null. Never invents an image. */
export function getCoverSrc(game: Pick<VideoGame, "image_url" | "image">): string | null {
  const src = game.image_url || game.image;
  return src ? src : null;
}

/**
 * Solo los hosts exactos de `imageHosts.ts` (los mismos que `remotePatterns` en next.config.ts) pasan por
 * el optimizador; cualquier otro se renderiza `unoptimized` para que next/image nunca falle.
 */
export function canOptimize(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && optimizableHosts().includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
