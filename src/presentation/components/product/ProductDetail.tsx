"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { useVideoGamesQuery } from "@/application/hooks/useVideoGamesQuery";
import { useBackdropFocus } from "@/presentation/providers/BackdropFocusProvider";
import { useAddToCart } from "@/presentation/hooks/useAddToCart";
import { useHydrated } from "@/presentation/hooks/useHydrated";
import { getCoverSrc } from "@/presentation/lib/cover";
import { formatCLP, genresOf, platformOf, stockLabel } from "@/presentation/lib/format";
import { CoverArt } from "@/presentation/components/catalog/GameCard";
import { SharedElement, coverTransitionName } from "@/presentation/components/motion/SharedElement";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";
import { ProductDetailSkeleton } from "@/presentation/components/product/ProductDetailSkeleton";

// WebGL loads only when the visitor asks for it; the cover stays as the poster meanwhile.
const GameBox3DViewer = dynamic(
  () => import("@/presentation/components/3d/GameBox3DViewer").then((m) => m.GameBox3DViewer),
  { ssr: false, loading: () => <div className="skeleton absolute inset-0 rounded-lg" /> },
);

export function ProductDetail({ id }: { id: string }) {
  const query = useVideoGamesQuery();
  const hydrated = useHydrated();
  const data = hydrated ? query.data : undefined;
  const isLoading = !hydrated || query.isLoading;
  const isError = hydrated && query.isError && !query.data;

  const game = useMemo(() => data?.find((g) => g.id === id) ?? null, [data, id]);
  const { setFocus } = useBackdropFocus();
  const addToCart = useAddToCart();
  const buyRef = useRef<HTMLButtonElement>(null);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setFocus(game ? getCoverSrc(game) : null);
    // Leaving the page hands the backdrop back to the neutral field (checkout, orders...).
    return () => setFocus(null);
  }, [game, isLoading, setFocus]);

  if (isError) {
    return (
      <div className="px-5 py-24">
        <ErrorState title="No pudimos cargar este juego" onRetry={() => query.refetch()} />
        <p className="mt-4 text-center">
          <Link href="/catalogo" className="font-semibold text-ink underline underline-offset-4 hover:no-underline">
            Volver al catálogo
          </Link>
        </p>
      </div>
    );
  }

  if (isLoading) return <ProductDetailSkeleton />;

  if (!game) {
    return (
      <div className="px-5 py-24">
        <EmptyState
          title="No encontramos este juego"
          detail="Puede que ya no esté en el catálogo o que el enlace esté incompleto."
          action={
            <Link href="/catalogo" className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg">
              Volver al catálogo
            </Link>
          }
        />
      </div>
    );
  }

  const platform = platformOf(game);
  const genres = genresOf(game);
  const soldOut = game.stock <= 0;
  const cover = getCoverSrc(game);

  return (
    <article className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:pt-10">
      <title>{`${game.title} | Nexus Digital Store`}</title>
      <nav aria-label="Ruta de navegación">
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center gap-1 rounded-pill pl-2 pr-4 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Catálogo
        </Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <SharedElement name={coverTransitionName(game.id)}>
            <div className="detail-cover relative mx-auto aspect-[3/4] w-[min(80vw,24rem)] overflow-hidden rounded-lg lg:w-full">
              {show3D ? (
                <GameBox3DViewer imageUrl={cover ?? undefined} title={game.title} platform={platform ?? undefined} />
              ) : (
                <div className="absolute inset-0">
                  <CoverArt game={game} priority sizes="(min-width: 1024px) 460px, 80vw" />
                </div>
              )}
            </div>
          </SharedElement>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShow3D((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover"
            >
              {show3D ? (
                <>
                  <ImageIcon aria-hidden="true" className="size-4" />
                  Ver portada
                </>
              ) : (
                <>
                  <Box aria-hidden="true" className="size-4" />
                  Ver en 3D
                </>
              )}
            </button>
          </div>
        </div>

        <div className="detail-info min-w-0 lg:col-span-7 lg:pt-6">
          <h1 className="font-display-wide text-display-2 font-[760] text-ink [overflow-wrap:anywhere]">{game.title}</h1>

          <div className="glass-card mt-8 flex flex-wrap items-center justify-between gap-5 rounded-lg p-5 sm:p-6">
            <div>
              <p className="tabular font-display text-price font-bold text-ink">{formatCLP(game.price_clp)}</p>
              <p className={`mt-1.5 text-sm ${soldOut ? "text-danger" : "text-ink-2"}`}>{stockLabel(game.stock)}</p>
            </div>
            <button
              ref={buyRef}
              type="button"
              disabled={soldOut}
              onClick={() => buyRef.current && addToCart(game, buyRef.current)}
              className="h-12 w-full rounded-pill bg-buy px-7 text-[0.9375rem] font-semibold text-on-buy transition-[background-color,transform] duration-(--dur-1) ease-out-soft hover:bg-buy-hover active:scale-[0.98] disabled:bg-surface-pressed disabled:text-ink-2 sm:w-auto"
            >
              {soldOut ? "Sin stock" : "Añadir al carrito"}
            </button>
          </div>

          {game.description && (
            <p className="mt-8 max-w-[62ch] text-[1.0625rem] leading-relaxed text-ink-2">{game.description}</p>
          )}

          <dl className="mt-8 grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-line pt-6 text-[0.9375rem]">
            {platform && (
              <>
                <dt className="text-ink-2">Plataforma</dt>
                <dd className="text-ink">{platform}</dd>
              </>
            )}
            {genres.length > 0 && (
              <>
                <dt className="text-ink-2">Géneros</dt>
                <dd className="text-ink">{genres.join(", ")}</dd>
              </>
            )}
            <dt className="text-ink-2">Disponibilidad</dt>
            <dd className="tabular text-ink">
              {soldOut ? "Sin stock" : `${game.stock} ${game.stock === 1 ? "unidad" : "unidades"}`}
            </dd>
          </dl>
        </div>
      </div>
    </article>
  );
}
