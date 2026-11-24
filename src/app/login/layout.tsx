import type { Metadata } from "next";
import { BackdropFocusProvider } from "@/presentation/providers/BackdropFocusProvider";
import { ChromaticBackdrop } from "@/presentation/components/shell/ChromaticBackdrop";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Entra a tu cuenta de Nexus Digital Store para pagar, ver tus pedidos y recuperar tus claves.",
  robots: { index: false },
};

/** No cover is in focus here, so the backdrop shows its neutral field. */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackdropFocusProvider>
      <ChromaticBackdrop />
      {children}
    </BackdropFocusProvider>
  );
}
