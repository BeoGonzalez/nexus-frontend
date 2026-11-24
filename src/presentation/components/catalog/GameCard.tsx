"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Gamepad2, Plus } from "lucide-react";
import type { VideoGame } from "@/domain/models";
import { canOptimize, getCoverSrc } from "@/presentation/lib/cover";
import { formatCLP, platformOf } from "@/presentation/lib/format";
import { SharedElement, coverTransitionName } from "@/presentation/components/motion/SharedElement";

type GameCardProps = {
  game: VideoGame;
  /** Position in the first render of a grid: drives the staggered entrance (capped at 8). */
  index?: number;
  /** Without it the card is not purchasable (e.g. a recommendation outside the catalogue). */
  onAdd?: (game: VideoGame, fromEl: HTMLElement) => void;
  /** False for recommendations that do not exist in the catalogue: no detail page to open. */
  linkable?: boolean;
  priority?: boolean;
  sizes?: string;
  /** Carry the cover into the detail page. Only one card per game per page may do this. */
  sharedTransition?: boolean;
};

function canFollowPointer() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function CoverArt({
  game,
  sizes,
  priority,
  onBroken,
}: {
  game: VideoGame;
  sizes: string;
  priority?: boolean;
  onBroken?: () => void;
}) {
  const src = getCoverSrc(game);
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div data-testid="cover-fallback" className="cover-fallback absolute inset-0 grid place-items-center">
        <Gamepad2 aria-hidden="true" className="size-8 text-ink-3" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <>
      {/* The same field shows while the cover loads, so loading and missing covers read alike. */}
      <div aria-hidden="true" className="cover-fallback absolute inset-0" />
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!canOptimize(src)}
        className="object-cover"
        onError={() => {
          setBroken(true);
          onBroken?.();
        }}
      />
    </>
  );
}

export function GameCard({
  game,
  index,
  onAdd,
  linkable = true,
  priority = false,
  sizes = "(min-width: 1280px) 260px, (min-width: 640px) 30vw, 46vw",
  sharedTransition = true,
}: GameCardProps) {
  const surface = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const platform = platformOf(game);
  const soldOut = game.stock <= 0;

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const el = surface.current;
    if (!el || e.pointerType !== "mouse" || !canFollowPointer()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    // The reflection follows the pointer; the card itself only lifts (no tilt).
    el.style.setProperty("--spec-x", `${((x - 0.5) * r.width).toFixed(1)}px`);
    el.style.setProperty("--spec-y", `${((y - 0.5) * r.height).toFixed(1)}px`);
  }

  const style = index === undefined ? undefined : ({ "--i": Math.min(index, 8) } as CSSProperties);

  const coverFrame = (
    <div className="relative aspect-[3/4] overflow-hidden rounded-md">
      <div className="cover-zoom absolute inset-0">
        <CoverArt game={game} sizes={sizes} priority={priority} />
      </div>
      <span aria-hidden="true" className="card-specular" />
    </div>
  );

  return (
    <article
      className="game-card group relative"
      data-cover={getCoverSrc(game) ?? undefined}
      data-enter={index === undefined ? undefined : ""}
      style={style}
      onPointerMove={onPointerMove}
    >
      <div ref={surface} className="card-surface glass-card relative flex h-full flex-col rounded-lg p-2">
        {sharedTransition ? <SharedElement name={coverTransitionName(game.id)}>{coverFrame}</SharedElement> : coverFrame}

        <div data-card-body className="flex min-w-0 flex-1 flex-col gap-0.5 px-1.5 pb-1 pt-3">
          <h3 className="min-h-[2.75em] text-[0.9375rem] font-medium leading-snug text-ink">
            {linkable ? (
              <Link href={`/juego/${game.id}`} className="card-link line-clamp-2">
                {game.title}
              </Link>
            ) : (
              <span className="line-clamp-2">{game.title}</span>
            )}
          </h3>
          {platform && <p className="text-sm text-ink-2">{platform}</p>}

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="tabular font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              {formatCLP(game.price_clp)}
            </span>
            {!onAdd ? null : soldOut ? (
              <button
                type="button"
                disabled
                className="relative z-10 h-9 rounded-pill px-3 text-sm font-medium text-ink-2 ring-1 ring-line-strong ring-inset"
              >
                Sin stock
              </button>
            ) : (
              <button
                ref={addButton}
                type="button"
                aria-label={`Añadir ${game.title} al carrito`}
                onClick={() => onAdd(game, addButton.current ?? surface.current!)}
                className="add-button relative z-10 grid size-11 place-items-center rounded-pill bg-buy text-on-buy transition-[background-color,transform] duration-(--dur-1) ease-out-soft hover:bg-buy-hover active:scale-[0.94] pointer-fine:size-10"
              >
                <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
