const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function formatCLP(n: number): string {
  return clp.format(n);
}

export function platformOf(game: { platform?: { name: string } | string }): string | null {
  const p = game.platform as { name: string } | string | undefined;
  if (!p) return null;
  return typeof p === "string" ? p : p.name || null;
}

export function genresOf(game: { genres?: Array<{ name: string } | string> }): string[] {
  return Array.isArray(game.genres) ? game.genres.map((g) => (typeof g === "string" ? g : g.name)).filter(Boolean) : [];
}

/** Availability from the real stock count. */
export function stockLabel(stock: number): string {
  if (stock <= 0) return "Sin stock";
  if (stock <= 5) return `Quedan ${stock}`;
  return "En stock";
}

const date = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short" });

/** Order dates as people in Chile read them (e.g. "20 nov 2026"). Invalid input is shown as given. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : date.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateTime.format(d);
}

/** First 8 characters of an order id, enough to recognise it. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
