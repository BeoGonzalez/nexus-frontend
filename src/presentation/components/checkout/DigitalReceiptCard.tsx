'use client';

import React, { useState } from 'react';
import { Check, Copy, Printer, Mail, CreditCard, RefreshCw } from 'lucide-react';
import type { DigitalReceipt } from '@/domain/models';
import { formatCLP } from '@/presentation/lib/format';

interface DigitalReceiptCardProps {
  receipt: DigitalReceipt;
  /** Why the email could not be sent, as the backend said it. */
  emailError?: string | null;
  onClose: () => void;
  onResendEmail?: () => Promise<void>;
}

const quietButton =
  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover disabled:opacity-50 pointer-fine:h-9';

export function DigitalReceiptCard({ receipt, emailError, onClose, onResendEmail }: DigitalReceiptCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleCopyKey = (key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleCopyAllKeys = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const formatted = receipt.license_keys.map((k) => `${k.product_title}: ${k.key}`).join('\n');
      navigator.clipboard.writeText(formatted);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleResend = async () => {
    if (!onResendEmail || isResending) return;
    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);
    try {
      await onResendEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      setResendError((err instanceof Error && err.message) || 'No pudimos reenviar la boleta.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 text-left text-ink">
      {/* Confirmación */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <span className="receipt-check grid size-11 shrink-0 place-items-center rounded-pill bg-success text-bg">
            <Check aria-hidden="true" className="size-5" strokeWidth={3} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display-wide text-title font-[760]">¡Pago Simulado Exitoso!</h2>
              <span className="rounded-pill px-2 py-0.5 text-xs font-semibold text-ink-2 ring-1 ring-line-strong ring-inset">
                Sandbox
              </span>
            </div>
            <p className="text-sm text-ink-2">Pago aprobado en la pasarela de pruebas y boleta emitida.</p>
          </div>
        </div>

        <button type="button" onClick={handlePrint} className={quietButton} title="Imprimir o guardar como PDF">
          <Printer aria-hidden="true" className="size-4" /> Imprimir boleta
        </button>
      </div>

      {/* Boleta electrónica: superficie opaca, se lee como un documento y se imprime limpia */}
      <article id="nexus-printable-receipt" aria-label="Boleta electrónica" className="surface-solid space-y-6 rounded-lg p-5 sm:p-7">
        <header className="grid gap-4 border-b border-line pb-6 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-2">
              <span className="font-display-wide text-lg font-[760] tracking-tight">NEXUS DIGITAL STORE</span>
              <span className="text-sm text-ink-2">SpA</span>
            </p>
            <p className="mt-1 text-sm text-ink-2">R.U.T.: 76.892.140-K</p>
            <p className="text-sm text-ink-2">Giro: Venta de Software y Licencias Digitales</p>
            <p className="text-sm text-ink-2">Av. Providencia 1208, Of. 601, Santiago, Chile</p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end sm:text-right">
            <div className="rounded-sm px-3.5 py-2 ring-1 ring-ink ring-inset">
              <span className="block text-sm font-semibold">Boleta electrónica</span>
              <span className="font-mono text-sm font-semibold">N° {receipt.folio}</span>
            </div>
            <p className="tabular text-sm text-ink-2">
              Emisión: {new Date(receipt.created_at).toLocaleString('es-CL')}
            </p>
          </div>
        </header>

        {/* Cliente y transacción */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-2">Cliente</dt>
            <dd className="font-medium">{receipt.customer_name || 'Comprador Gamer'}</dd>
          </div>
          <div>
            <dt className="text-ink-2">Correo de despacho</dt>
            <dd className="font-medium [overflow-wrap:anywhere]">{receipt.customer_email}</dd>
          </div>
          <div>
            <dt className="text-ink-2">Método de pago</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <CreditCard aria-hidden="true" className="size-4 text-ink-2" /> {receipt.payment_method.brand} (•••• {receipt.payment_method.last4})
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">ID de transacción</dt>
            <dd className="font-mono text-[0.8125rem] [overflow-wrap:anywhere]">{receipt.transaction_id}</dd>
          </div>
        </dl>

        {/* Detalle */}
        <div>
          <h3 className="mb-2 font-semibold">Detalle de la compra</h3>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th scope="col" className="pb-2 font-medium">Juego</th>
                  <th scope="col" className="pb-2 pl-3 text-center font-medium">Cant.</th>
                  <th scope="col" className="hidden pb-2 pl-3 text-right font-medium sm:table-cell">Unitario</th>
                  <th scope="col" className="pb-2 pl-3 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {receipt.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-medium">
                      {item.title}
                      <span className="tabular block text-sm font-normal text-ink-2 sm:hidden">
                        {formatCLP(item.unit_price_clp)} c/u
                      </span>
                    </td>
                    <td className="tabular py-2.5 pl-3 text-center align-top text-ink-2 sm:align-middle">{item.quantity}</td>
                    <td className="tabular hidden py-2.5 pl-3 text-right text-ink-2 sm:table-cell">{formatCLP(item.unit_price_clp)}</td>
                    <td className="tabular whitespace-nowrap py-2.5 pl-3 text-right align-top font-semibold sm:align-middle">{formatCLP(item.subtotal_clp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="tabular space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ink-2">
            <span>Subtotal neto</span>
            <span>{formatCLP(receipt.subtotal_neto_clp)} CLP</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>IVA (19%)</span>
            <span>{formatCLP(receipt.iva_clp)} CLP</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed border-line-strong pt-2.5">
            <span className="font-semibold">Total pagado</span>
            <span className="font-display text-price font-bold">{formatCLP(receipt.total_clp)} CLP</span>
          </div>
        </div>

        {/* Claves de activación */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Claves de activación</h3>
            {receipt.license_keys.length > 1 && (
              <button type="button" onClick={handleCopyAllKeys} className={quietButton}>
                {allCopied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {allCopied ? '¡Todas copiadas!' : 'Copiar todas'}
              </button>
            )}
          </div>

          <ul className="space-y-2">
            {receipt.license_keys.map((k, index) => {
              const isCopied = copiedKey === k.key;
              return (
                <li
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-sm bg-surface-hover px-4 py-3"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm text-ink-2">{k.product_title}</span>
                    <span className="whitespace-nowrap font-mono text-[0.875rem] font-semibold sm:text-[0.9375rem] sm:tracking-wide">{k.key}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(k.key)}
                    aria-label={isCopied ? `Clave de ${k.product_title} copiada` : `Copiar clave de ${k.product_title}`}
                    className={quietButton}
                  >
                    {isCopied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
                    <span aria-hidden="true" className="hidden sm:inline">{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </article>

      {/* Envío por correo */}
      <div className="glass-card flex flex-col items-start justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Mail aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-2" />
          <div className="min-w-0">
            {receipt.email_sent === false ? (
              <>
                <p className="text-sm font-medium text-danger">
                  No pudimos enviar la boleta a <span className="[overflow-wrap:anywhere]">{receipt.customer_email}</span>.
                </p>
                {emailError && <p className="mt-0.5 text-sm text-ink-2">{emailError}</p>}
                <p className="mt-0.5 text-sm text-ink-2">Tus claves están en esta boleta; puedes copiarlas o imprimirla.</p>
              </>
            ) : (
              <>
                <p className="text-sm">
                  <span className="font-medium">Boleta y claves enviadas a: </span>
                  <span className="font-semibold [overflow-wrap:anywhere]">{receipt.customer_email}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink-2">Si no la ves, revisa la carpeta de spam.</p>
              </>
            )}
            {resendError && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {resendError}
              </p>
            )}
          </div>
        </div>

        {onResendEmail && (
          <button type="button" onClick={handleResend} disabled={isResending} className={quietButton}>
            <RefreshCw aria-hidden="true" className={`size-4 ${isResending ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            {resendSuccess ? '¡Reenviado!' : isResending ? 'Enviando…' : 'Reenviar correo'}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="h-12 w-full rounded-pill bg-ink text-[0.9375rem] font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
      >
        Finalizar y volver a la tienda
      </button>
    </div>
  );
}
