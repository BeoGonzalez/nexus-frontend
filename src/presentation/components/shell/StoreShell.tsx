"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { VideoGame } from "@/domain/models";
import { useVideoGamesQuery } from "@/application/hooks/useVideoGamesQuery";
import { useAddToCartMutation } from "@/application/hooks/useCartQuery";
import { SessionProvider } from "@/presentation/providers/SessionProvider";
import { BackdropFocusProvider, useBackdropFocus } from "@/presentation/providers/BackdropFocusProvider";
import { CartUIProvider, useCartUI } from "@/presentation/providers/CartUIProvider";
import { AnnouncerProvider, useAnnounce } from "@/presentation/components/shell/Announcer";
import { ChromaticBackdrop } from "@/presentation/components/shell/ChromaticBackdrop";
import { NavBar } from "@/presentation/components/shell/NavBar";
import { CartDrawer } from "@/presentation/components/cart/CartDrawer";
import { AiChatAssistantWidget } from "@/presentation/components/chat/AiChatAssistantWidget";

function Assistant() {
  const router = useRouter();
  const announce = useAnnounce();
  const { data: catalog = [] } = useVideoGamesQuery();
  const addToCart = useAddToCartMutation();
  const { open: cartOpen } = useCartUI();
  const { focus } = useBackdropFocus();

  return (
    <AiChatAssistantWidget
      catalog={catalog}
      hidden={cartOpen}
      coverSrc={focus}
      onAddToCart={(game: VideoGame) => {
        addToCart.mutate({ product_id: game.id, quantity: 1 });
        announce(`${game.title} añadido al carrito`);
      }}
      onSelectGame={(game: VideoGame) => router.push(`/juego/${game.id}`)}
    />
  );
}

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <BackdropFocusProvider>
        <CartUIProvider>
          <AnnouncerProvider>
            <ChromaticBackdrop />
            <a
              href="#contenido"
              className="glass-chrome fixed left-3 top-3 z-[70] -translate-y-24 rounded-pill px-4 py-2.5 text-sm font-medium text-ink focus:translate-y-0"
            >
              Saltar al contenido
            </a>
            <NavBar />
            <main id="contenido" tabIndex={-1} className="relative outline-none">
              {children}
            </main>
            <CartDrawer />
            <Assistant />
          </AnnouncerProvider>
        </CartUIProvider>
      </BackdropFocusProvider>
    </SessionProvider>
  );
}
