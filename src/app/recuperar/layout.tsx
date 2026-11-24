import type { Metadata } from "next";
import { BackdropFocusProvider } from "@/presentation/providers/BackdropFocusProvider";
import { ChromaticBackdrop } from "@/presentation/components/shell/ChromaticBackdrop";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Restablece la contraseña de tu cuenta de Nexus Digital Store.",
  robots: { index: false },
};

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackdropFocusProvider>
      <ChromaticBackdrop />
      {children}
    </BackdropFocusProvider>
  );
}
