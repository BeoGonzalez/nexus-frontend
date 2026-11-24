'use client';

import Link from 'next/link';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import {
  useTrendingRecommendationsQuery,
  useForYouRecommendationsQuery,
} from '@/application/hooks/useRecommendationsQuery';
import type { RecommendationResponse, VideoGame } from '@/domain/models';
import { useSession } from '@/presentation/providers/SessionProvider';
import { GameCard } from '@/presentation/components/catalog/GameCard';
import { GameCardSkeleton } from '@/presentation/components/catalog/GameCardSkeleton';

interface RecommendationSectionProps {
  catalog: VideoGame[];
  /** Game already shown elsewhere on the page (its cover transition name must stay unique). */
  excludeId?: string;
  onAddToCart?: (game: VideoGame, fromEl?: HTMLElement) => void;
  /** @deprecated kept for the temporary /legacy page; cards now link to /juego/[id]. */
  onSelectGame?: (game: VideoGame) => void;
}

type Tab = 'trending' | 'for-you';

export function RecommendationSection({ catalog, excludeId, onAddToCart }: RecommendationSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('trending');
  const { loggedIn } = useSession();

  const { data: trendingData, isLoading: trendingLoading } = useTrendingRecommendationsQuery(6);
  const { data: forYouData, isLoading: forYouLoading } = useForYouRecommendationsQuery(6);

  // Same catalogue match and fallback as before the redesign.
  const toGame = (item: RecommendationResponse): { game: VideoGame; inCatalog: boolean } => {
    const foundGame = catalog.find(
      (g) => g.id === item.product_id || g.title.toLowerCase() === item.title.toLowerCase(),
    );
    const game: VideoGame = foundGame || {
      id: item.product_id,
      title: item.title,
      price_clp: item.price_clp,
      stock: 10,
      image_url: item.image_url || undefined,
    };
    return { game, inCatalog: !!foundGame };
  };

  const renderList = (list: RecommendationResponse[] | undefined, loading: boolean, tab: Tab) => {
    if (loading) {
      return (
        <ul aria-busy="true" className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <GameCardSkeleton />
            </li>
          ))}
        </ul>
      );
    }
    if (tab === 'for-you' && !loggedIn) {
      return (
        <p className="mt-8 max-w-md text-ink-2">
          Las recomendaciones personales se basan en tus compras.{' '}
          <Link href="/login?redirect=%2F" className="font-semibold text-ink underline">
            Ingresa a tu cuenta
          </Link>{' '}
          para verlas.
        </p>
      );
    }
    const items = (list ?? []).filter((rec) => toGame(rec).game.id !== excludeId);
    if (items.length === 0) {
      return <p className="mt-8 text-ink-2">No hay recomendaciones disponibles en este momento.</p>;
    }
    return (
      <ul
        className={
          items.length < 4
            ? "mt-8 flex flex-wrap gap-3 sm:gap-4 [&>li]:w-[calc(50%-0.375rem)] sm:[&>li]:w-56"
            : "mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        }
      >
        {items.map((rec, i) => {
          const { game, inCatalog } = toGame(rec);
          return (
            <li key={rec.product_id} className="flex flex-col gap-2">
              <GameCard game={game} index={i} linkable={inCatalog} sharedTransition={false} onAdd={inCatalog ? (g, el) => onAddToCart?.(g, el) : undefined} />
              {rec.recommendation_reason && <p className="text-sm text-ink-2">{rec.recommendation_reason}</p>}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section aria-labelledby="recomendados" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="recomendados" className="font-display-wide text-display-2 font-[760] text-ink">
            Recomendados
          </h2>
          <Tabs.List aria-label="Tipo de recomendación" className="theme-toggle inline-flex rounded-pill p-1">
            {(
              [
                ['trending', 'En tendencia'],
                ['for-you', 'Para ti'],
              ] as const
            ).map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="h-10 rounded-pill px-4 text-sm font-semibold text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:text-ink data-[state=active]:bg-bg-elevated data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
        <Tabs.Content value="trending" className="outline-none">
          {renderList(trendingData, trendingLoading, 'trending')}
        </Tabs.Content>
        <Tabs.Content value="for-you" className="outline-none">
          {renderList(forYouData, forYouLoading, 'for-you')}
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
