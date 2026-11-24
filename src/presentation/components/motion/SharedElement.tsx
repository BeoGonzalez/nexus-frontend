"use client";

import * as React from "react";
import type { ReactNode } from "react";

/**
 * React's <ViewTransition> ships in the canary React that Next's App Router bundles. Outside it
 * (unit tests, older runtimes) this renders children unchanged, so nothing depends on it existing.
 */
const ViewTransition = (React as unknown as { ViewTransition?: React.ComponentType<{ name?: string; children: ReactNode }> })
  .ViewTransition;

export function SharedElement({ name, children }: { name: string; children: ReactNode }) {
  if (!ViewTransition) return <>{children}</>;
  return <ViewTransition name={name}>{children}</ViewTransition>;
}

export const coverTransitionName = (id: string) => `cover-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
