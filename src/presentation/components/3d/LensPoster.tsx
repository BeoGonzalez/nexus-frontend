import { canOptimize } from "@/presentation/lib/cover";

/** Small, same-origin copy of a cover, so WebGL (and the poster) read it cheaply and without CORS trouble. */
export function lensCoverUrl(src: string): string {
  return canOptimize(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=128&q=75` : src;
}

/** The assistant lens without WebGL: the focused cover inside a glass capsule (avatar, loading, fallback). */
export function LensPoster({ coverSrc }: { coverSrc?: string | null }) {
  return (
    <span aria-hidden="true" className="lens-poster">
      {coverSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lensCoverUrl(coverSrc)} alt="" />
      )}
    </span>
  );
}
