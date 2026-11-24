"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Plus,
  Search,
  Check,
  X,
  Loader2,
  Gamepad2,
  Image as ImageIcon,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Database,
  ServerOff,
  AlertCircle,
} from "lucide-react";
import { fetchClient } from "@/infrastructure/api/fetchClient";
import { adjustStockAction, createProductAction } from "@/application/actions/adminGames";
import type { VideoGame } from "@/domain/models";

const AVAILABLE_GENRES = [
  "Acción",
  "RPG",
  "Aventura",
  "Shooter",
  "Estrategia",
  "Deportes",
  "Simulación",
  "Terror / Survival",
  "Lucha",
  "Mundo Abierto",
];

const PLATFORMS = ["PC", "PS5", "Xbox Series X", "Nintendo Switch"];

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export function VideoGamesCrud() {
  // Lista de videojuegos proveniente EXCLUSIVAMENTE de la base de datos (Docker Compose / Aurora)
  const [games, setGames] = useState<VideoGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Filtros y búsquedas
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("TODAS");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc" | "title">("recent");
  const [viewMode, setViewMode] = useState<"table" | "grid">(() =>
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches ? "grid" : "table"
  );

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Previews de imágenes
  const [addImagePreview, setAddImagePreview] = useState("");

  // Notificaciones Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Cargar videojuegos desde el backend conectado a Aurora
  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    setLoading(true);
    setConnectionError(null);
    try {
      // Lectura siempre vía BFF del mismo origen (OWASP A01).
      const data = await fetchClient<VideoGame[]>("/api/v1/catalog/products");
      if (Array.isArray(data)) {
        setGames(data);
      } else {
        setGames([]);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Error al conectar con la base de datos de Amazon Aurora / Docker Compose";
      setConnectionError(errorMsg);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }

  // 1. CREATE GAME (Directo en Aurora PostgreSQL vía Backend API)
  async function handleCreateGame(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSaving(true);

    try {
      const title = String(formData.get("title") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const price = Number(formData.get("price"));
      const stock = Number(formData.get("stock") ?? 0);
      const platformName = String(formData.get("platform") || "PC");
      const selectedGenre = String(formData.get("genre") || "Acción");
      const customGenre = String(formData.get("custom_genre") || "").trim();
      const genreName = customGenre || selectedGenre;
      const imageUrl = String(formData.get("image") || "").trim();

      const payload = {
        title,
        description,
        price_clp: price,
        stock,
        platform_name: platformName,
        image_url: imageUrl || null,
        genre_names: [genreName],
      };

      // Server Action con requireAdmin() y validación Zod en el servidor (OWASP A01/A05).
      const result = await createProductAction(payload);
      if (!result.success) throw new Error(result.error);
      const newGame = result.data;

      // Si la API retorna el juego creado en base de datos, lo añadimos
      if (newGame && newGame.id) {
        setGames((prev) => [newGame, ...prev]);
      } else {
        // En caso de que retorne status 201 sin el cuerpo completo, sincronizamos con la BD
        await fetchGames();
      }

      setCreateModalOpen(false);
      setAddImagePreview("");
      showToast(`¡Videojuego "${title}" registrado en Amazon Aurora con éxito!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el videojuego en la base de datos";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  // Modificación rápida de stock directa en backend
  const handleQuickStock = async (game: VideoGame, delta: number) => {
    const newStock = Math.max(0, (game.stock || 0) + delta);

    try {
      const result = await adjustStockAction(game.id, delta);
      if (!result.success) throw new Error(result.error);
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, stock: newStock } : g))
      );
      showToast(`Stock de "${game.title}" actualizado a ${newStock} unidades en Aurora`, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar stock en la base de datos";
      showToast(msg, "error");
    }
  };

  // Métricas calculadas en tiempo real desde la BD
  const metrics = useMemo(() => {
    const totalCount = games.length;
    const totalStock = games.reduce((acc, g) => acc + (g.stock || 0), 0);
    const outOfStockCount = games.filter((g) => (g.stock || 0) <= 0).length;
    const totalValuation = games.reduce((acc, g) => acc + (g.price_clp || 0) * (g.stock || 0), 0);

    return { totalCount, totalStock, outOfStockCount, totalValuation };
  }, [games]);

  // Filtrado y ordenamiento en memoria de los registros obtenidos de la BD
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        const matchesSearch =
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          (g.category && g.category.toLowerCase().includes(search.toLowerCase())) ||
          (g.description && g.description.toLowerCase().includes(search.toLowerCase()));

        const currentPlatform =
          typeof g.platform === "string" ? g.platform : g.platform?.name || "PC";
        const matchesPlatform =
          platformFilter === "TODAS" || currentPlatform.toLowerCase() === platformFilter.toLowerCase();

        const currentStock = g.stock ?? 0;
        const matchesStock =
          stockFilter === "ALL" ||
          (stockFilter === "IN_STOCK" && currentStock > 0) ||
          (stockFilter === "OUT_OF_STOCK" && currentStock <= 0);

        return matchesSearch && matchesPlatform && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.price_clp - b.price_clp;
        if (sortBy === "price_desc") return b.price_clp - a.price_clp;
        if (sortBy === "stock_asc") return (a.stock || 0) - (b.stock || 0);
        if (sortBy === "stock_desc") return (b.stock || 0) - (a.stock || 0);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return 0; // "recent"
      });
  }, [games, search, platformFilter, stockFilter, sortBy]);

  return (
    <div className="space-y-8">
      {/* Toast de retroalimentación accesible */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md px-5 py-3.5 text-sm font-bold shadow-lg  border  slide-in-from-bottom-5 duration-300 ${
            toast.type === "success"
              ? "bg-bg-elevated text-ink border-line-strong "
              : toast.type === "error"
              ? "bg-bg-elevated text-danger border-danger/40 "
              : "bg-bg-elevated text-ink border-line-strong"
          }`}
        >
          <Sparkles size={18} className="shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header y Botón Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display-wide text-[1.75rem] font-[760] leading-tight text-ink">Gestión de Videojuegos</h1>
            {connectionError ? (
              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger border border-danger/30 flex items-center gap-1.5">
                <ServerOff size={12} aria-hidden="true" /> Desconectado de Aurora
              </span>
            ) : (
              <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-ink border border-line flex items-center gap-1.5">
                <Database size={12} aria-hidden="true" className="text-success" /> Aurora PostgreSQL conectado
              </span>
            )}
          </div>
          <p className="text-ink-2 text-sm mt-1">
            Administración en tiempo real de registros alojados en Amazon Aurora PostgreSQL mediante el backend de Docker Compose.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchGames}
            title="Sincronizar con base de datos"
            disabled={loading}
            className="flex items-center gap-2 whitespace-nowrap rounded-sm border border-line-strong bg-surface-hover px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-pressed hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sincronizar con BD</span>
          </button>

          <button
            onClick={() => {
              setAddImagePreview("");
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 whitespace-nowrap rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-all hover:bg-ink/85 active:scale-[0.98]"
          >
            <Plus size={18} aria-hidden="true" /> Nuevo videojuego
          </button>
        </div>
      </div>

      {/* Banner de alerta si la base de datos / backend no está corriendo */}
      {connectionError && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-5 text-ink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-sm bg-warning/15 flex items-center justify-center text-warning shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Sin conexión con el backend (Docker / Aurora)</h3>
              <p className="text-xs text-ink-2 mt-0.5">
                No se han cargado datos porque no hay juegos hardcodeados. Inicia el backend con{" "}
                <code className="font-mono font-bold bg-bg-elevated px-1.5 py-0.5 rounded text-ink">
                  docker compose up -d
                </code>{" "}
                para consultar los registros reales de Amazon Aurora.
              </p>
            </div>
          </div>
          <button
            onClick={fetchGames}
            disabled={loading}
            className="rounded-sm bg-warning text-bg px-4 py-2 text-xs font-bold hover:bg-warning/90 transition-colors shrink-0"
          >
            {loading ? "CONECTANDO..." : "REINTENTAR CONEXIÓN"}
          </button>
        </div>
      )}

      {/* Resumen de inventario: una franja densa, sin tarjetas decorativas */}
      <dl className="surface-solid grid grid-cols-2 divide-line rounded-md sm:grid-cols-4 sm:divide-x [&>div]:px-4 [&>div]:py-3">
        <div>
          <dt className="text-xs text-ink-2">Total Títulos</dt>
          <dd className="tabular text-xl font-semibold text-ink">{metrics.totalCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Unidades Stock</dt>
          <dd className="tabular text-xl font-semibold text-ink">{metrics.totalStock.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Agotados</dt>
          <dd className={`tabular text-xl font-semibold ${metrics.outOfStockCount > 0 ? "text-danger" : "text-ink"}`}>
            {metrics.outOfStockCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Valuación Stock</dt>
          <dd className="tabular text-xl font-semibold text-ink">${metrics.totalValuation.toLocaleString("es-CL")}</dd>
        </div>
      </dl>

      {/* Barra de Filtros, Búsqueda y Modos de Vista */}
      <div className="flex flex-col gap-4 surface-solid rounded-md p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, género o plataforma en Aurora..."
            className="w-full rounded-sm border border-line-strong bg-bg-elevated pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-focus placeholder:text-ink-2"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros de Plataforma */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["TODAS", ...PLATFORMS].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`rounded-xs px-3 py-1.5 text-xs font-bold transition-all ${
                platformFilter === p
                  ? "bg-ink text-bg"
                  : "bg-surface-hover text-ink-2 hover:bg-surface-pressed hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Filtro de Stock y Orden */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por stock"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            className="rounded-sm border border-line-strong bg-bg-elevated px-3 py-2 text-xs font-bold text-ink-2 outline-none focus:border-focus"
          >
            <option value="ALL">Todo el Stock</option>
            <option value="IN_STOCK">En Stock (&gt; 0)</option>
            <option value="OUT_OF_STOCK">Agotados (0)</option>
          </select>

          <select
            aria-label="Ordenar por"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-sm border border-line-strong bg-bg-elevated px-3 py-2 text-xs font-bold text-ink-2 outline-none focus:border-focus"
          >
            <option value="recent">Más recientes</option>
            <option value="title">Nombre A-Z</option>
            <option value="price_asc">Precio: Menor a Mayor</option>
            <option value="price_desc">Precio: Mayor a Menor</option>
            <option value="stock_asc">Stock: Menor a Mayor</option>
            <option value="stock_desc">Stock: Mayor a Menor</option>
          </select>

          {/* Toggle Vista Tabla / Grid */}
          <div className="flex rounded-sm border border-line-strong bg-bg-elevated p-0.5">
            <button
              onClick={() => setViewMode("table")}
              title="Vista en tabla"
              aria-pressed={viewMode === "table"}
              className={`rounded-xs p-1.5 transition-colors ${
                viewMode === "table" ? "bg-surface-pressed text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Vista en cuadrícula"
              aria-pressed={viewMode === "grid"}
              className={`rounded-xs p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-surface-pressed text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-sm border border-line bg-surface-hover px-4 py-3 text-xs text-ink-2">
        <AlertCircle aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
        Editar y eliminar no están disponibles: el servicio de catálogo aún no expone esas operaciones.
        Puedes crear productos y ajustar su stock.
      </p>

      {/* Contenido Principal (Tabla o Grid) */}
      {loading ? (
        <div className="surface-solid rounded-md p-12 text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-ink" />
          <p className="mt-3 text-sm text-ink-2 font-mono">
            Consultando catálogo en Amazon Aurora PostgreSQL...
          </p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="surface-solid rounded-md p-12 text-center">
          <Gamepad2 size={40} className="mx-auto text-ink-3 mb-3" />
          <h3 className="text-lg font-bold text-ink">
            {connectionError
              ? "Base de datos no disponible"
              : "No hay videojuegos en la base de datos de Aurora"}
          </h3>
          <p className="text-sm text-ink-2 mt-1 max-w-md mx-auto">
            {connectionError
              ? "Levanta el servicio con docker compose para sincronizar los datos reales."
              : "La tabla de videojuegos está vacía. Haz clic en 'NUEVO VIDEOJUEGO' para dar de alta el primer registro."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={fetchGames}
              className="rounded-sm bg-surface-hover border border-line-strong px-4 py-2 text-xs font-bold text-ink hover:bg-surface-pressed transition-colors"
            >
              Recargar
            </button>
            <button
              onClick={() => {
                setAddImagePreview("");
                setCreateModalOpen(true);
              }}
              className="rounded-sm bg-ink px-5 py-2 text-xs font-bold text-bg hover:bg-ink/85 transition-colors"
            >
              + Añadir Primer Videojuego
            </button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* VISTA TABLA */
        <div className="surface-solid overflow-hidden rounded-md">
          <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
            <table className="w-full text-left text-sm text-ink-2">
              <thead className="text-xs text-ink-2">
                <tr>
                  <th scope="col" className="sticky top-0 z-[1] border-b border-line-strong bg-bg-elevated px-4 py-2.5 font-medium">Videojuego</th>
                  <th scope="col" className="sticky top-0 z-[1] border-b border-line-strong bg-bg-elevated px-4 py-2.5 font-medium">Plataforma</th>
                  <th scope="col" className="sticky top-0 z-[1] border-b border-line-strong bg-bg-elevated px-4 py-2.5 font-medium">Género</th>
                  <th scope="col" className="sticky top-0 z-[1] border-b border-line-strong bg-bg-elevated px-4 py-2.5 font-medium">Precio (CLP)</th>
                  <th scope="col" className="sticky top-0 z-[1] border-b border-line-strong bg-bg-elevated px-4 py-2.5 font-medium">Stock & Control Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredGames.map((game) => {
                  const stockNumber = Number(game.stock ?? 0);
                  const isOutOfStock = stockNumber <= 0;
                  const platformName =
                    typeof game.platform === "string" ? game.platform : game.platform?.name || "—";
                  const genreName =
                    game.category || (Array.isArray(game.genres) && game.genres[0]?.name) || "—";

                  return (
                    <tr key={game.id} className="transition-colors hover:bg-surface-hover">
                      {/* Portada y Título */}
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-4">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-surface-hover">
                            {game.image_url || game.image ? (
                              <img
                                src={game.image_url || game.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Gamepad2 size={16} aria-hidden="true" className="text-ink-3" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-xs truncate font-medium text-ink">
                              {game.title}
                            </div>
                            <div className="text-xs text-ink-2 line-clamp-1 max-w-sm">
                              {game.description || "Sin descripción"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plataforma */}
                      <td className="px-4 py-1.5">
                        <span className="text-sm text-ink">
                          {platformName}
                        </span>
                      </td>

                      {/* Género */}
                      <td className="px-4 py-1.5">
                        <span className="inline-flex rounded-xs bg-surface-hover border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink">
                          {genreName}
                        </span>
                      </td>

                      {/* Precio */}
                      <td className="tabular px-4 py-1.5 font-semibold text-ink">
                        ${game.price_clp.toLocaleString("es-CL")}
                      </td>

                      {/* Stock con acciones rápidas inline */}
                      <td className="px-4 py-1.5">
                        <div className="flex items-center gap-3">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-bold text-danger border border-danger/30">
                              <span className="size-1.5 rounded-full bg-danger" /> Agotado (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success border border-success/30">
                              <span className="size-1.5 rounded-full bg-success" /> <span className="tabular">{stockNumber}</span> u.
                            </span>
                          )}

                          {/* Botones de ajuste de stock */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickStock(game, -1)}
                              aria-label={`Restar 1 unidad a ${game.title}`}
                              title="Restar 1 unidad"
                              className="flex size-7 items-center justify-center rounded-xs bg-surface-hover text-sm font-semibold text-ink-2 hover:bg-surface-pressed hover:text-ink"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuickStock(game, +1)}
                              aria-label={`Sumar 1 unidad a ${game.title}`}
                              title="Sumar 1 unidad"
                              className="flex size-7 items-center justify-center rounded-xs bg-surface-hover text-sm font-semibold text-ink-2 hover:bg-surface-pressed hover:text-ink"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA GRID DE CARDS */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGames.map((game) => {
            const stockNumber = Number(game.stock ?? 0);
            const isOutOfStock = stockNumber <= 0;
            const platformName =
              typeof game.platform === "string" ? game.platform : game.platform?.name || "—";
            const genreName =
              game.category || (Array.isArray(game.genres) && game.genres[0]?.name) || "—";

            return (
              <div
                key={game.id}
                className="group relative flex min-w-0 flex-col surface-solid rounded-md p-4 transition-colors hover:border-line-strong"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface-hover mb-4">
                  <img
                    src={game.image_url || game.image || ""}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="rounded-xs bg-surface-pressed px-2.5 py-1 text-xs font-mono font-bold text-ink border border-line-strong">
                      {platformName}
                    </span>
                    <span className="rounded-xs bg-surface-pressed px-2.5 py-1 text-xs font-bold text-ink border border-line-strong">
                      {genreName}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-ink text-lg truncate">{game.title}</h3>
                <p className="mt-1 text-xs text-ink-2 line-clamp-2 flex-1">
                  {game.description || "Sin descripción disponible."}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <div>
                    <span className="text-xs text-ink-2 block font-bold">Precio</span>
                    <span className="font-mono text-base font-bold text-ink">
                      ${game.price_clp.toLocaleString("es-CL")}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-ink-2 block font-bold">Stock</span>
                    {isOutOfStock ? (
                      <span className="text-xs font-bold text-danger">Agotado (0)</span>
                    ) : (
                      <span className="text-xs font-bold text-success">{stockNumber} disponibles</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREAR NUEVO VIDEOJUEGO */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sheet-scrim p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" className="glass-raised my-8 w-full max-w-2xl rounded-lg p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-line-strong pb-4">
              <div>
                <h2 className="text-2xl font-bold text-ink">Añadir Nuevo Videojuego</h2>
                <p className="text-xs text-ink-2 mt-1">
                  Registra el juego directamente en la base de datos de Amazon Aurora PostgreSQL.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-full p-2 text-ink-2 hover:bg-surface-pressed hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-2">
                    Título del juego *
                  </label>
                  <input
                    name="title"
                    required
                    className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                    placeholder="Ej. Cyberpunk 2077"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-2">
                    Género / categoría *
                  </label>
                  <select
                    name="genre"
                    className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  >
                    {AVAILABLE_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-2">
                  Descripción del juego *
                </label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  placeholder="Sinopsis, mecánicas principales y requisitos..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-2">
                    Precio (CLP) *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="1"
                    defaultValue={39990}
                    required
                    className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-2">
                    Stock inicial *
                  </label>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={25}
                    required
                    className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-2">
                    Plataforma *
                  </label>
                  <select
                    name="platform"
                    className="w-full rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-2">
                  URL de portada (S3 Bucket / Web)
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    name="image"
                    type="url"
                    value={addImagePreview}
                    onChange={(e) => setAddImagePreview(e.target.value)}
                    placeholder="https://bucket-name.s3.amazonaws.com/covers/..."
                    className="flex-1 rounded-sm border border-line-strong bg-bg-elevated px-4 py-2.5 text-sm text-ink outline-none focus:border-focus"
                  />
                  <div className="size-14 rounded-sm border border-line-strong bg-surface-hover overflow-hidden shrink-0 flex items-center justify-center">
                    {addImagePreview ? (
                      <img
                        src={addImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setAddImagePreview("")}
                      />
                    ) : (
                      <ImageIcon size={20} className="text-ink-3" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line-strong">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-sm px-5 py-2.5 text-sm font-bold text-ink-2 hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-sm bg-ink px-6 py-2.5 text-sm font-bold text-bg transition-all hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? "Registrando en BD…" : "Guardar en Aurora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
