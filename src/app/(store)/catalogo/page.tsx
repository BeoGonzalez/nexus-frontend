import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/presentation/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos los juegos de Nexus con filtros por plataforma y género.",
};

export default function CatalogPage() {
  // useSearchParams needs a Suspense boundary so the page can prerender its shell.
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}
