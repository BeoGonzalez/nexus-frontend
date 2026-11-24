export function ProductDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando juego" className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:pt-10">
      <div className="skeleton h-5 w-24 rounded-xs" />
      <div className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-12 lg:gap-14">
        <div className="skeleton mx-auto aspect-[3/4] w-[min(80vw,24rem)] rounded-lg lg:col-span-5 lg:w-full" />
        <div className="space-y-4 lg:col-span-7 lg:pt-6">
          <div className="skeleton h-4 w-24 rounded-xs" />
          <div className="skeleton h-12 w-4/5 rounded-sm" />
          <div className="skeleton mt-8 h-24 w-full rounded-lg" />
          <div className="skeleton h-4 w-full rounded-xs" />
          <div className="skeleton h-4 w-3/4 rounded-xs" />
        </div>
      </div>
    </div>
  );
}
