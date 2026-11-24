'use client';

import React, { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { Dialog } from 'radix-ui';
import { Send, X, RotateCcw, Loader2, Gamepad2, Plus, Check, Eye } from 'lucide-react';
import { useAiAssistant } from '@/application/hooks/useAiAssistant';

/** Mismo límite que el backend (ChatRequest.query ≤ 2000): evita 422 y abuso de tokens (LLM10). */
const MAX_MESSAGE_CHARS = 2000;
import { LensPoster } from '@/presentation/components/3d/LensPoster';
import { useAssistantHealthQuery } from '@/application/hooks/useAssistantQuery';
import type { VideoGame } from '@/domain/models';
import { formatCLP } from '@/presentation/lib/format';
import { cn } from '@/lib/utils';

interface AiChatAssistantWidgetProps {
  catalog: VideoGame[];
  onAddToCart?: (game: VideoGame) => void;
  onSelectGame?: (game: VideoGame) => void;
  /** Hide the launcher while another panel (the cart) owns the screen. */
  hidden?: boolean;
  /** The cover lighting the page; the assistant's lens shows it. */
  coverSrc?: string | null;
}


// three.js (~900 KB) stays off the critical path: the orb loads on its own chunk once the page is idle.
const ChatBotOrb = dynamic(() => import('@/presentation/components/3d/ChatBotOrb'), {
  ssr: false,
  loading: () => <LensPoster />,
});

function useIdle(timeout = 4000) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdle(true), 1500);
    return () => window.clearTimeout(t);
  }, [timeout]);
  return idle;
}

const STARTER_PROMPTS = [
  'Recomiéndame un RPG épico de acción',
  '¿Cuáles son los juegos más vendidos en PC?',
  'Busco ofertas o juegos con gran historia',
  '¿Qué juego de terror o suspenso recomiendas?',
];

/**
 * Formatea texto básico de markdown (negritas, viñetas, saltos de línea) de manera segura sin dependencias pesadas.
 */
function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  const paragraphs = text.split('\n\n');

  return (
    <div className="space-y-2.5">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n');
        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => {
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');

              return (
                <React.Fragment key={lIdx}>
                  {isBullet && <span aria-hidden="true" className="mr-1.5 inline-block text-ink-3">•</span>}
                  {parts.map((part, partIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <strong key={partIdx} className="font-semibold">
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    return <span key={partIdx}>{part}</span>;
                  })}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

const iconButton =
  'grid size-11 place-items-center rounded-pill text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink pointer-fine:size-9';

export function AiChatAssistantWidget({ catalog, onAddToCart, onSelectGame, hidden = false, coverSrc = null }: AiChatAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const { data: healthData, isError: isHealthError, isLoading: isHealthLoading } = useAssistantHealthQuery();
  const isLlmOnline = !isHealthError && healthData?.status === 'healthy';

  const { messages, isLoading, error, recommendedProducts, sendMessage, clearChat } = useAiAssistant();

  const idle = useIdle();
  const orb = idle ? <ChatBotOrb coverSrc={coverSrc} /> : <LensPoster coverSrc={coverSrc} />;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final del chat cuando llegan nuevos tokens o mensajes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, recommendedProducts]);

  // A finished reply is announced once, never token by token while it streams.
  const announcement = useMemo(() => {
    if (isLoading || messages.length <= 1) return '';
    const last = messages[messages.length - 1];
    return last.role === 'assistant' ? last.content : '';
  }, [messages, isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || isLoading) return;
    setInputValue('');
    sendMessage(query);
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  const handleAddToCart = (product: { id: string; title: string; price_clp?: string | number }) => {
    const found = catalog.find(
      (g) => g.id === product.id || g.title.toLowerCase() === product.title.toLowerCase()
    );

    const gameToAdd: VideoGame = found || {
      id: product.id,
      title: product.title,
      price_clp: typeof product.price_clp === 'number' ? product.price_clp : 29990,
      stock: 10,
    };

    onAddToCart?.(gameToAdd);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const handleInspectGame = (product: { id: string; title: string; price_clp?: string | number }) => {
    const found = catalog.find(
      (g) => g.id === product.id || g.title.toLowerCase() === product.title.toLowerCase()
    );

    if (found) {
      onSelectGame?.(found);
    }
  };

  if (hidden && !isOpen) return null;

  const status = isLlmOnline ? 'En línea' : isHealthLoading ? 'Conectando…' : 'Sin conexión';

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <Dialog.Trigger
        aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
        className="assistant-launcher glass-chrome fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center overflow-hidden rounded-pill text-ink sm:bottom-6 sm:right-6"
      >
        {isOpen ? <X aria-hidden="true" className="size-6" /> : orb}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="assistant-panel glass-raised fixed inset-x-3 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] z-40 flex max-h-[min(36rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-xl text-ink sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[25rem]"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-pill bg-surface-hover">
              <LensPoster coverSrc={coverSrc} />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-semibold leading-tight">Asistente Nexus</Dialog.Title>
              <p className="flex items-center gap-1.5 text-sm text-ink-2">
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-pill', isLlmOnline ? 'bg-success' : isHealthLoading ? 'bg-warning' : 'bg-danger')}
                />
                {status}
              </p>
            </div>
            <button type="button" onClick={clearChat} aria-label="Reiniciar conversación" className={iconButton}>
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
            <Dialog.Close aria-label="Cerrar asistente" className={iconButton}>
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </header>

          <p className="sr-only" aria-live="polite" data-assistant-live>
            {announcement}
          </p>

          <div ref={chatScrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 text-[0.9375rem]">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-lg px-4 py-2.5',
                    msg.role === 'user' ? 'rounded-br-xs bg-ink text-bg' : 'rounded-bl-xs bg-surface-hover text-ink',
                  )}
                >
                  {msg.content ? (
                    <FormattedMessageText text={msg.content} />
                  ) : isLoading && i === messages.length - 1 ? (
                    <span className="flex items-center gap-2 text-sm text-ink-2">
                      <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
                      Buscando en el catálogo…
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {error && (
              <p role="alert" className="rounded-sm px-3 py-2 text-sm text-danger ring-1 ring-danger ring-inset">
                {error}
              </p>
            )}

            {recommendedProducts && recommendedProducts.length > 0 && (
              <div className="pt-1">
                <p className="mb-2 px-1 text-sm font-medium text-ink-2">Juegos que te recomienda</p>
                <ul className="space-y-2">
                  {recommendedProducts.map((prod) => {
                    const isAdded = !!addedItemIds[prod.id];
                    const foundGame = catalog.find((g) => g.id === prod.id);
                    const cover = foundGame?.image_url || foundGame?.image;
                    const price = foundGame?.price_clp ?? (prod.price_clp ? Number(prod.price_clp) : null);

                    return (
                      <li key={prod.id} className="flex items-center gap-3 rounded-sm bg-surface-hover p-2.5">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="size-10 shrink-0 rounded-xs object-cover" />
                        ) : (
                          <div className="cover-fallback grid size-10 shrink-0 place-items-center rounded-xs">
                            <Gamepad2 aria-hidden="true" className="size-4 text-ink-3" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={prod.title}>
                            {prod.title}
                          </p>
                          {price !== null && <p className="tabular text-sm text-ink-2">{formatCLP(price)}</p>}
                        </div>
                        {foundGame && (
                          <button
                            type="button"
                            onClick={() => handleInspectGame(prod)}
                            aria-label={`Ver ${prod.title}`}
                            className={iconButton}
                          >
                            <Eye aria-hidden="true" className="size-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddToCart(prod)}
                          aria-label={isAdded ? `${prod.title} añadido` : `Añadir ${prod.title} al carrito`}
                          className={cn(
                            'grid size-11 shrink-0 place-items-center rounded-pill transition-[background-color,transform] duration-(--dur-1) ease-out-soft active:scale-[0.96] pointer-fine:size-9',
                            isAdded ? 'bg-success text-bg' : 'bg-buy text-on-buy hover:bg-buy-hover',
                          )}
                        >
                          {isAdded ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {messages.length <= 1 && (
              <div className="mt-2 border-t border-line pt-3">
                <p className="mb-2 text-sm text-ink-2">Puedes empezar con:</p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handlePromptClick(prompt)}
                      className="rounded-sm px-3 py-2.5 text-left text-sm text-ink ring-1 ring-line ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-line p-3">
            <div className="relative">
              <label htmlFor="assistant-input" className="sr-only">
                Mensaje para el asistente
              </label>
              <input
                id="assistant-input"
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregunta por un juego…"
                disabled={isLoading}
                autoComplete="off"
                maxLength={MAX_MESSAGE_CHARS}
                aria-describedby="assistant-input-counter"
                className="h-12 w-full rounded-pill bg-bg-elevated pl-4 pr-14 text-[1rem] text-ink ring-1 ring-line-strong ring-inset placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Enviar mensaje"
                className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-pill bg-ink text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.94] disabled:bg-surface-pressed disabled:text-ink-3"
              >
                {isLoading ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Send aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            <p
              id="assistant-input-counter"
              className={`mt-1.5 px-4 text-right text-xs tabular-nums ${
                MAX_MESSAGE_CHARS - inputValue.length <= 100 ? 'text-danger' : 'text-ink-3'
              }`}
            >
              {MAX_MESSAGE_CHARS - inputValue.length} caracteres restantes
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
