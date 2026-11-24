"use client";

import { useCallback } from "react";
import type { VideoGame } from "@/domain/models";
import { useAddToCartMutation } from "@/application/hooks/useCartQuery";
import { useCartUI } from "@/presentation/providers/CartUIProvider";
import { useAnnounce } from "@/presentation/components/shell/Announcer";
import { getCoverSrc } from "@/presentation/lib/cover";

/** Same mutation as the former store (product_id, quantity 1) plus the visual confirmation. */
export function useAddToCart() {
  const addToCartMutation = useAddToCartMutation();
  const { flyToCart } = useCartUI();
  const announce = useAnnounce();

  return useCallback(
    (game: VideoGame, fromEl?: HTMLElement | null) => {
      addToCartMutation.mutate({ product_id: game.id, quantity: 1 });
      if (fromEl) flyToCart(fromEl, getCoverSrc(game) ?? undefined);
      announce(`${game.title} añadido al carrito`);
    },
    [addToCartMutation, flyToCart, announce],
  );
}
