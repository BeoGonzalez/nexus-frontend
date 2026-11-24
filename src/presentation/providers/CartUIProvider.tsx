"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type CartUI = {
  open: boolean;
  setOpen: (v: boolean) => void;
  registerCartTarget: (el: HTMLElement | null) => void;
  /** The registered cart button, so the drawer can hand focus back to it. */
  getCartTarget: () => HTMLElement | null;
  flyToCart: (from: HTMLElement, imageSrc?: string) => void;
  bumpKey: number;
};

const CartUIContext = createContext<CartUI | null>(null);

const FLYER_SIZE = 56;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function token(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function ms(value: string, fallback: number) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.endsWith("ms") ? n : n * 1000;
}

/**
 * A copy of the cover leaves the button that was pressed and lands on the cart.
 * FLIP: the flyer is placed at its final spot and animated from the inverted offset,
 * so only transform and opacity change. No backdrop-filter on the flyer.
 */
function flight(from: HTMLElement, to: HTMLElement, imageSrc: string | undefined, onLand: () => void) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.className = "cart-flyer";
  flyer.setAttribute("aria-hidden", "true");
  if (imageSrc) flyer.style.backgroundImage = `url("${imageSrc.replace(/"/g, "%22")}")`;
  const endX = b.left + b.width / 2 - FLYER_SIZE / 2;
  const endY = b.top + b.height / 2 - FLYER_SIZE / 2;
  flyer.style.left = `${endX}px`;
  flyer.style.top = `${endY}px`;
  document.body.appendChild(flyer);

  if (typeof flyer.animate !== "function") {
    flyer.remove();
    onLand();
    return;
  }

  const dx = a.left + a.width / 2 - FLYER_SIZE / 2 - endX;
  const dy = a.top + a.height / 2 - FLYER_SIZE / 2 - endY;
  // A short rise before the drop reads as a throw, not a slide.
  const lift = Math.min(120, Math.abs(dy) * 0.35 + 40);
  let anim: Animation;
  try {
    anim = flyer.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1, easing: token("--out-soft", "ease-out") },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.8)`, opacity: 1, offset: 0.45, easing: token("--in-soft", "ease-in") },
      { transform: "translate(0, 0) scale(0.32)", opacity: 0.2 },
    ],
    {
      // Longer throws get a little more time, never past the 400 ms ceiling for UI motion.
      duration: Math.min(400, ms(token("--dur-3", "360ms"), 360) + Math.hypot(dx, dy) / 40),
      easing: "linear",
      fill: "forwards",
    },
  );
  } catch {
    // Older engines reject CSS linear()/cubic tokens in WAAPI: skip the flight, keep the feedback.
    flyer.remove();
    onLand();
    return;
  }
  const done = () => {
    flyer.remove();
    onLand();
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

export function CartUIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const targetRef = useRef<HTMLElement | null>(null);

  const registerCartTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const getCartTarget = useCallback(() => targetRef.current, []);

  const flyToCart = useCallback((from: HTMLElement, imageSrc?: string) => {
    const bump = () => setBumpKey((k) => k + 1);
    const target = targetRef.current;
    // Reduced motion or no visible cart: no flight, the counter just fades in.
    if (!target || reducedMotion() || target.getClientRects().length === 0) {
      bump();
      return;
    }
    flight(from, target, imageSrc, bump);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, registerCartTarget, getCartTarget, flyToCart, bumpKey }),
    [open, registerCartTarget, getCartTarget, flyToCart, bumpKey],
  );
  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI(): CartUI {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside <CartUIProvider>");
  return ctx;
}
