"use client";

import Link from "next/link";
import { useRef } from "react";
import type { VideoGame } from "@/domain/models";
import { getCoverSrc } from "@/presentation/lib/cover";
import { formatCLP, genresOf, platformOf, stockLabel } from "@/presentation/lib/format";
import { CoverArt } from "@/presentation/components/catalog/GameCard";
import { SharedElement, coverTransitionName } from "@/presentation/components/motion/SharedElement";

function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function HeroFeatured({
  game,
  onAdd,
}: {
  game: VideoGame;
  onAdd: (game: VideoGame, fromEl: HTMLElement) => void;
}) {
  const platform = platformOf(game);
  const genres = genresOf(game).slice(0, 2);
  const buyRef = useRef<HTMLButtonElement>(null);
  // The featured game is the newest in the catalogue (pickFeatured); say so only when dates prove it.
  const isNew = Boolean(game.created_at && !Number.isNaN(Date.parse(game.created_at)));
  const soldOut = game.stock <= 0;
  const longTitle = game.title.length > 26;

  return (
    <section
      data-cover={getCoverSrc(game) ?? undefined}
      aria-labelledby="hero-title"
      data-enter
      className="hero mx-auto grid max-w-6xl content-center gap-6 px-5 pb-16 pt-5 sm:gap-8 sm:px-8 sm:pt-8 lg:min-h-[calc(100svh-5.5rem)] lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-12"
    >
      <SharedElement name={coverTransitionName(game.id)}>
      <Link
        href={`/juego/${game.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="hero-cover-frame relative mx-auto block aspect-[3/4] w-[min(60vw,30svh,20rem)] overflow-hidden rounded-lg sm:w-[min(68vw,20rem)] lg:col-span-5 lg:w-full"
      >
        <div className="absolute inset-0">
          <CoverArt game={game} priority sizes="(min-width: 1024px) 420px, (min-width: 640px) 68vw, 60vw" />
        </div>
      </Link>
      </SharedElement>

      <div className="min-w-0 lg:col-span-7">
        <h1
          id="hero-title"
          className={`hero-line hero-meta font-display-wide font-[760] text-ink [overflow-wrap:anywhere] ${
            longTitle ? "text-display-2" : "text-display-1"
          }`}
        >
          {game.title}
        </h1>
        {(platform || genres.length > 0 || isNew) && (
          <div className="hero-line hero-title mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] text-ink-2">
            {platform && (
              <span className="glass-card rounded-pill px-3 py-1 text-sm font-semibold text-ink">{platform}</span>
            )}
            {genres.length > 0 && <span>{joinSpanish(genres)}</span>}
            {isNew && <span className="font-medium text-ink">Recién llegado al catálogo</span>}
          </div>
        )}
        {game.description && (
          <p className="hero-line hero-desc mt-4 line-clamp-3 max-w-[52ch] text-base leading-relaxed text-ink-2 max-sm:line-clamp-1 sm:mt-5 sm:text-[1.0625rem]">
            {game.description}
          </p>
        )}

        <div className="hero-line hero-buy mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 sm:mt-8">
          <div>
            <p className="tabular font-display text-price font-bold text-ink">{formatCLP(game.price_clp)}</p>
            <p className="mt-1.5 text-sm text-ink-2">{stockLabel(game.stock)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              ref={buyRef}
              type="button"
              disabled={soldOut}
              onClick={() => buyRef.current && onAdd(game, buyRef.current)}
              className="h-12 rounded-pill bg-buy px-6 text-[0.9375rem] font-semibold text-on-buy transition-[background-color,transform] duration-(--dur-1) ease-out-soft hover:bg-buy-hover active:scale-[0.98] disabled:bg-surface-pressed disabled:text-ink-2"
            >
              {soldOut ? "Sin stock" : "Añadir al carrito"}
            </button>
            <Link
              href={`/juego/${game.id}`}
              className="inline-flex h-12 items-center rounded-pill px-6 text-[0.9375rem] font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover"
            >
              Ver ficha
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-14 lg:pt-14">
      <div className="skeleton mx-auto aspect-[3/4] w-[min(68vw,20rem)] rounded-lg lg:col-span-5 lg:w-full" />
      <div className="space-y-4 lg:col-span-7">
        <div className="skeleton h-4 w-40 rounded-xs" />
        <div className="skeleton h-16 w-full max-w-lg rounded-sm" />
        <div className="skeleton h-4 w-full max-w-md rounded-xs" />
        <div className="skeleton h-4 w-4/5 max-w-md rounded-xs" />
        <div className="flex gap-2 pt-6">
          <div className="skeleton h-12 w-44 rounded-pill" />
          <div className="skeleton h-12 w-32 rounded-pill" />
        </div>
      </div>
    </div>
  );
}
