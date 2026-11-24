import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

/** Unknown URLs: the store's own ground and type, with a way back. */
export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-5 px-5 py-16 sm:px-8">
      <p className="wordmark font-display-wide text-ink">Nexus</p>
      <h1 className="font-display-wide text-display-2 font-[760] leading-tight text-ink">No encontramos esta página</h1>
      <p className="max-w-[48ch] text-[1.0625rem] text-ink-2">
        Puede que el enlace esté incompleto o que la página ya no exista. Los juegos siguen en el catálogo.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
        >
          Ir al catálogo
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-pill px-5 text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-hover"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
