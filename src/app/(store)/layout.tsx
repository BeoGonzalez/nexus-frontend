import type { ReactNode } from "react";
import { StoreShell } from "@/presentation/components/shell/StoreShell";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
