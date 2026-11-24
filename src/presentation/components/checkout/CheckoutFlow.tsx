"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronDown, ChevronLeft, CreditCard, FlaskConical, Loader2, LockKeyhole } from "lucide-react";
import { useCartQuery, useClearCartMutation } from "@/application/hooks/useCartQuery";
import {
  usePaymentMethodsQuery,
  useAddPaymentMethodMutation,
  useCreateOrderMutation,
  usePayOrderMutation,
} from "@/application/hooks/useOrderMutations";
import { useSendReceiptMutation } from "@/application/hooks/useNotificationsQuery";
import type { DigitalLicenseKey, DigitalReceipt } from "@/domain/models";
import { useSession } from "@/presentation/providers/SessionProvider";
import { useAnnounce } from "@/presentation/components/shell/Announcer";
import { cartTotals, toCartLines, type CartLine } from "@/presentation/lib/cartLines";
import { formatCLP } from "@/presentation/lib/format";
import { cn } from "@/lib/utils";
import { CoverArt } from "@/presentation/components/catalog/GameCard";
import { DigitalReceiptCard } from "@/presentation/components/checkout/DigitalReceiptCard";
import { CheckoutSteps, type CheckoutStep } from "@/presentation/components/checkout/CheckoutSteps";
import { EmptyState } from "@/presentation/components/feedback/EmptyState";
import { ErrorState } from "@/presentation/components/feedback/ErrorState";

const LOGIN_REDIRECT = "/login?redirect=%2Fcheckout";

const fieldLabel = "mb-1.5 block text-sm font-medium text-ink";
const fieldInput =
  "h-12 w-full rounded-sm bg-bg-elevated px-4 text-[1rem] text-ink ring-1 ring-line-strong ring-inset transition-shadow duration-(--dur-1) ease-out-soft placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";
const primaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-buy px-7 text-[0.9375rem] font-semibold text-on-buy transition-[background-color,transform] duration-(--dur-1) ease-out-soft hover:bg-buy-hover active:scale-[0.98] disabled:bg-surface-pressed disabled:text-ink-2 disabled:active:scale-100";

function PageFrame({ step, children }: { step?: CheckoutStep; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:pt-10">
      <h1 className="font-display-wide text-display-2 font-[760] text-ink">Pagar</h1>
      {step && (
        <div className="mt-5">
          <CheckoutSteps current={step} />
        </div>
      )}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pago" className="grid gap-8 lg:grid-cols-12">
      <div className="skeleton h-96 rounded-lg lg:col-span-7" />
      <div className="skeleton h-64 rounded-lg lg:col-span-5" />
    </div>
  );
}

function OrderSummary({ cart, total }: { cart: CartLine[]; total: number }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const count = cartTotals(cart).count;
  return (
    <aside aria-labelledby={`${listId}-title`} className="glass-raised rounded-lg p-5 sm:p-6 lg:sticky lg:top-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left lg:pointer-events-none"
      >
        <span id={`${listId}-title`} className="font-semibold text-ink">
          Resumen del pedido <span className="tabular font-normal text-ink-2">({count})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular font-semibold text-ink lg:hidden">{formatCLP(total)}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 text-ink-2 transition-transform duration-(--dur-2) ease-spring lg:hidden", open && "rotate-180")}
          />
        </span>
      </button>
      <div id={listId} className={cn("lg:block", open ? "block" : "hidden")}>
        <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {cart.map((item) => (
            <li key={item.cartId} className="flex items-center gap-3 text-sm">
              <div className="relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-xs">
                <CoverArt game={item} sizes="40px" />
              </div>
              <span className="line-clamp-2 flex-1 text-ink">
                <span className="tabular text-ink-2">{item.quantity} × </span>
                {item.title}
              </span>
              <span className="tabular shrink-0 font-medium text-ink">{formatCLP((item.price_clp || 0) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-ink-2">Total</span>
          <span className="tabular font-display text-price font-bold text-ink">{formatCLP(total)}</span>
        </div>
        <p className="mt-2 text-sm text-ink-2">IVA incluido. Las claves llegan a tu correo.</p>
      </div>
    </aside>
  );
}

export function CheckoutFlow() {
  const router = useRouter();
  const announce = useAnnounce();
  const { user, loggedIn, ready } = useSession();
  const cartQuery = useCartQuery();
  const clearCartMutation = useClearCartMutation();
  const cart = useMemo(() => toCartLines(cartQuery.data), [cartQuery.data]);
  const { total } = cartTotals(cart);

  const { data: paymentMethods = [], isLoading: loadingPayments } = usePaymentMethodsQuery(loggedIn);
  const addPaymentMethodMutation = useAddPaymentMethodMutation();
  const createOrderMutation = useCreateOrderMutation();
  const payOrderMutation = usePayOrderMutation();
  const sendReceiptMutation = useSendReceiptMutation();

  // State moved unchanged from the former store's checkout.
  // null = el usuario no lo ha editado: se usa el dato de la sesión (valor derivado, sin efectos).
  const [billingNameInput, setBillingName] = useState<string | null>(null);
  const [billingEmailInput, setBillingEmail] = useState<string | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<DigitalReceipt | null>(null);
  const [complete, setComplete] = useState(false);
  const [selectedPaymentMethodInput, setSelectedPaymentMethod] = useState<string>("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: "", brand: "Visa" });

  // Presentation only.
  const [step, setStep] = useState<"Datos" | "Pago">("Datos");
  const [payError, setPayError] = useState<string | null>(null);
  // The backend sends the receipt only to the account's email (403 otherwise); its answer is shown, not assumed.
  const [receiptEmailError, setReceiptEmailError] = useState<string | null>(null);
  const accountEmail = user?.email || null;
  const receiptRef = useRef<HTMLDivElement>(null);
  const showToast = announce;

  // The pay button disappears with the form: start the receipt from the top and move focus there.
  useEffect(() => {
    if (!complete) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo?.({ top: 0, behavior: reduce ? "auto" : "smooth" });
    receiptRef.current?.focus({ preventScroll: true });
  }, [complete]);

  useEffect(() => {
    if (ready && !loggedIn) router.replace(LOGIN_REDIRECT);
  }, [ready, loggedIn, router]);

  const billingName = billingNameInput ?? user?.name ?? "";
  const billingEmail = billingEmailInput ?? user?.email ?? "";
  const selectedPaymentMethod = selectedPaymentMethodInput || paymentMethods[0]?.id || "";

  const fillSandboxTestData = () => {
    setBillingName(user?.name || "Alex García");
    setBillingEmail(user?.email || "alex.gamer@nexus-store.cl");
    setNewCard({ number: "4242 4242 4242 4242", brand: "Visa" });
    showToast("Datos de prueba Sandbox cargados");
  };

  // Payment handler moved unchanged from the former store (only the inline error line is new).
  async function handlePay(event: FormEvent) {
    event.preventDefault();

    if (cart.length === 0) {
      showToast("El carrito de compras está vacío.");
      return;
    }

    setPayError(null);
    setIsSimulatingPayment(true);
    try {
      let activePaymentMethodId = selectedPaymentMethod;
      let activeBrand = "Visa Sandbox";
      let activeLast4 = "4242";

      setSimulationStep("1/4 Conectando con pasarela de pagos simulada (Sandbox)...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (showAddCard || paymentMethods.length === 0) {
        const cleanNumber = newCard.number.replace(/\s+/g, "") || "4242424242424242";
        activeLast4 = cleanNumber.slice(-4) || "4242";
        activeBrand = cleanNumber.startsWith("4")
          ? "Visa Sandbox"
          : cleanNumber.startsWith("5")
          ? "Mastercard Sandbox"
          : "Tarjeta Sandbox";

        const newPm = await addPaymentMethodMutation.mutateAsync({
          card_number: cleanNumber,
          card_brand: activeBrand,
          is_default: paymentMethods.length === 0,
        });
        activePaymentMethodId = newPm.id;
        setSelectedPaymentMethod(newPm.id);
        setShowAddCard(false);
      } else {
        const pmSelected = paymentMethods.find((pm) => pm.id === activePaymentMethodId);
        if (pmSelected) {
          activeBrand = pmSelected.card_brand;
          activeLast4 = pmSelected.card_last_4;
        }
      }

      setSimulationStep("2/4 Validando autorización bancaria simulada y creando orden...");
      const finalCustomerEmail = (billingEmail || user?.email || "alex.gamer@nexus-store.cl").trim();
      const finalCustomerName = (billingName || user?.name || "Alex García").trim();
      const simTxnId = `SIM-TXN-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const payload = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        customer_email: finalCustomerEmail,
      };

      const newOrder = await createOrderMutation.mutateAsync(payload);
      const orderId = newOrder?.id || `sim-ord-${Date.now()}`;

      setSimulationStep("3/4 Acreditando pago en microservicio de órdenes y emitiendo boleta...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (newOrder?.id) {
        try {
          await payOrderMutation.mutateAsync({
            orderId: newOrder.id,
            paymentId: simTxnId,
          });
        } catch (payErr) {
          void payErr; // La transición de pago queda registrada en el outbox del backend.
        }
      }

      // Generación de Boleta Electrónica Fiscal y Claves Digitales
      // El total oficial lo calcula el backend (A06); el del carrito es solo un respaldo visual.
      const totalCLP = typeof newOrder?.total_amount_clp === "number" ? newOrder.total_amount_clp : total;
      const subtotalNeto = Math.round(totalCLP / 1.19);
      const ivaCLP = totalCLP - subtotalNeto;
      const folioNum = Math.floor(10000 + Math.random() * 90000);
      const folio = `BOL-2026-NEXUS-${folioNum}`;

      const licenseKeys: DigitalLicenseKey[] = cart.map((item) => ({
        product_id: item.id,
        product_title: item.title,
        key: `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      }));

      const generatedReceipt: DigitalReceipt = {
        folio,
        order_id: orderId,
        created_at: new Date().toISOString(),
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail,
        payment_method: {
          brand: activeBrand,
          last4: activeLast4,
          type: "SIMULATED_CARD",
        },
        transaction_id: simTxnId,
        items: cart.map((item) => ({
          product_id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price_clp: item.price_clp || 0,
          subtotal_clp: (item.price_clp || 0) * item.quantity,
        })),
        subtotal_neto_clp: subtotalNeto,
        iva_clp: ivaCLP,
        total_clp: totalCLP,
        license_keys: licenseKeys,
        issuer: {
          company: "NEXUS DIGITAL STORE SpA",
          rut: "76.892.140-K",
          address: "Av. Providencia 1208, Of. 601, Providencia, Santiago",
          activity: "Venta de Software, Videojuegos y Licencias Digitales",
        },
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      };

      setSimulationStep("4/4 Enviando boleta electrónica y claves de activación por correo...");
      let emailError: string | null = null;
      try {
        await sendReceiptMutation.mutateAsync({
          order_id: orderId,
          customer_name: finalCustomerName,
          customer_email: finalCustomerEmail,
          receipt: generatedReceipt,
        });
      } catch (emailErr) {
        void emailErr; // Fallo secundario: la UI ofrece reenviar la boleta.
        emailError = (emailErr instanceof Error && emailErr.message) || "El servicio de correo no respondió.";
      }

      setReceiptData(emailError ? { ...generatedReceipt, email_sent: false, email_sent_at: undefined } : generatedReceipt);
      setReceiptEmailError(emailError);
      setComplete(true);
      clearCartMutation.mutate();
      showToast(
        emailError
          ? "¡Pago simulado exitoso! No pudimos enviar la boleta por correo."
          : `¡Pago simulado exitoso! Boleta enviada a ${finalCustomerEmail}`,
      );
    } catch (e) {
      const message = (e instanceof Error && e.message) || "Error inesperado procesando el pago simulado";
      setPayError(message);
      showToast(message);
    } finally {
      setIsSimulatingPayment(false);
      setSimulationStep(null);
    }
  }

  // Session not read yet, or about to redirect to the login.
  if (!ready || !loggedIn) {
    return (
      <PageFrame>
        <CheckoutSkeleton />
      </PageFrame>
    );
  }

  if (complete && receiptData) {
    return (
      <PageFrame step="Recibo">
        <div ref={receiptRef} tabIndex={-1} aria-label="Boleta del pago" className="receipt-in outline-none">
          <DigitalReceiptCard
            receipt={receiptData}
            emailError={receiptEmailError}
            onClose={() => {
              clearCartMutation.mutate();
              router.push("/");
            }}
            onResendEmail={async () => {
              await sendReceiptMutation.mutateAsync({
                order_id: receiptData.order_id,
                customer_name: receiptData.customer_name,
                customer_email: receiptData.customer_email,
                receipt: receiptData,
              });
              setReceiptEmailError(null);
              setReceiptData({ ...receiptData, email_sent: true, email_sent_at: new Date().toISOString() });
              showToast(`Boleta reenviada con éxito a ${receiptData.customer_email}`);
            }}
          />
        </div>
      </PageFrame>
    );
  }

  if (cartQuery.isError && !cartQuery.data) {
    return (
      <PageFrame>
        <ErrorState title="No pudimos cargar tu carrito" onRetry={() => cartQuery.refetch()} />
      </PageFrame>
    );
  }

  if (cartQuery.isLoading && !cartQuery.data) {
    return (
      <PageFrame>
        <CheckoutSkeleton />
      </PageFrame>
    );
  }

  if (cart.length === 0) {
    return (
      <PageFrame>
        <EmptyState
          title="No hay nada que pagar"
          detail="Tu carrito está vacío. Elige un juego del catálogo y vuelve aquí."
          action={
            <Link
              href="/catalogo"
              className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
            >
              Explorar catálogo
            </Link>
          }
        />
      </PageFrame>
    );
  }

  const busy = isSimulatingPayment || createOrderMutation.isPending || addPaymentMethodMutation.isPending;
  const needsCard = showAddCard || paymentMethods.length === 0;

  return (
    <PageFrame step={busy ? "Procesando" : step}>
      <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:order-2 lg:col-span-5">
          <OrderSummary cart={cart} total={total} />
        </div>

        <div className="glass-card rounded-lg p-5 sm:p-7 lg:order-1 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-surface-hover px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-ink">
              <FlaskConical aria-hidden="true" className="size-4 text-ink-2" />
              Modo sandbox: los pagos son simulados.
            </p>
            <button
              type="button"
              onClick={fillSandboxTestData}
              className="rounded-pill px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-pressed"
            >
              Cargar datos de prueba
            </button>
          </div>

          {step === "Datos" ? (
            <form
              key="datos"
              className="step-in mt-7 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setStep("Pago");
              }}
            >
              <h2 className="text-title font-semibold text-ink">Tus datos</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="billing-name" className={fieldLabel}>
                    Nombre completo
                  </label>
                  <input
                    id="billing-name"
                    required
                    autoComplete="name"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label htmlFor="billing-email" className={fieldLabel}>
                    Correo para la boleta y las claves
                  </label>
                  <input
                    id="billing-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    readOnly={Boolean(accountEmail)}
                    aria-describedby={accountEmail ? "billing-email-hint" : undefined}
                    className={cn(fieldInput, accountEmail && "bg-surface-hover text-ink-2")}
                  />
                  {accountEmail && (
                    <p id="billing-email-hint" className="mt-1.5 text-sm text-ink-2">
                      La boleta y las claves se envían al correo de tu cuenta.
                    </p>
                  )}
                </div>
              </div>
              <button type="submit" className={cn(primaryButton, "sm:w-auto")}>
                Continuar al pago
              </button>
            </form>
          ) : (
            <form key="pago" className="step-in mt-7 space-y-5" onSubmit={handlePay}>
              <h2 className="flex items-center gap-2 text-title font-semibold text-ink">
                <CreditCard aria-hidden="true" className="size-5 text-ink-2" />
                Pago simulado
              </h2>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm text-ink-2 [overflow-wrap:anywhere]">
                  Boleta a nombre de <span className="text-ink">{billingName}</span>, enviada a{" "}
                  <span className="text-ink">{billingEmail}</span>.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("Datos")}
                  aria-label="Editar datos"
                  className="-mt-2.5 inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill pl-2 pr-3 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Editar
                </button>
              </div>

              {loadingPayments ? (
                <div aria-busy="true" aria-label="Cargando tarjetas" className="skeleton h-24 rounded-sm" />
              ) : (
                <>
                  {paymentMethods.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 rounded-pill bg-surface-hover p-1">
                      {[
                        { label: "Tarjeta guardada", value: false },
                        { label: "Nueva tarjeta", value: true },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          aria-pressed={showAddCard === opt.value}
                          onClick={() => setShowAddCard(opt.value)}
                          className="h-10 rounded-pill text-sm font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft aria-pressed:bg-bg-elevated aria-pressed:text-ink aria-pressed:shadow-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {paymentMethods.length > 0 && !showAddCard ? (
                    <fieldset className="space-y-2">
                      <legend className="sr-only">Tarjeta de prueba guardada</legend>
                      {paymentMethods.map((pm) => (
                        <label
                          key={pm.id}
                          className="flex cursor-pointer items-center gap-3 rounded-sm px-4 py-3.5 ring-1 ring-line-strong ring-inset transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover has-[:checked]:bg-surface-pressed has-[:checked]:ring-2 has-[:checked]:ring-ink"
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={pm.id}
                            checked={selectedPaymentMethod === pm.id}
                            onChange={() => setSelectedPaymentMethod(pm.id)}
                            className="size-4 accent-[var(--ink)]"
                          />
                          <span className="flex flex-col">
                            <span className="font-medium text-ink">
                              {pm.card_brand} terminada en <span className="font-mono">{pm.card_last_4}</span>
                            </span>
                            <span className="text-sm text-ink-2">
                              {pm.is_default ? "Predeterminada para pruebas" : "Entorno de pruebas"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="card-number" className={fieldLabel}>
                          Número de tarjeta de prueba
                        </label>
                        <input
                          id="card-number"
                          required={needsCard}
                          inputMode="numeric"
                          autoComplete="off"
                          value={newCard.number}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                            const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                            setNewCard({ ...newCard, number: formatted });
                          }}
                          className={cn(fieldInput, "tabular font-mono")}
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          aria-describedby="card-hint"
                        />
                        <p id="card-hint" className="mt-1.5 text-sm text-ink-2">
                          Usa una tarjeta de prueba. No se cobra nada.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="card-exp" className={fieldLabel}>
                            Vencimiento
                          </label>
                          <input
                            id="card-exp"
                            required={needsCard}
                            autoComplete="off"
                            className={cn(fieldInput, "tabular font-mono")}
                            placeholder="MM/AA"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label htmlFor="card-cvc" className={fieldLabel}>
                            CVC
                          </label>
                          <input
                            id="card-cvc"
                            required={needsCard}
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            className={cn(fieldInput, "tabular font-mono")}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "flex items-center gap-2.5 rounded-sm text-sm text-ink",
                  simulationStep ? "bg-surface-hover px-4 py-3" : "sr-only",
                )}
              >
                {simulationStep && (
                  <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-ink-2 motion-reduce:animate-none" />
                )}
                {simulationStep}
              </p>

              {payError && (
                <div role="alert" className="rounded-sm px-4 py-3 text-sm text-danger ring-1 ring-danger ring-inset">
                  <p className="font-semibold">No se pudo completar el pago.</p>
                  <p className="mt-0.5">{payError}</p>
                </div>
              )}

              <button type="submit" disabled={busy} aria-busy={busy} className={primaryButton}>
                {busy ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                    Procesando pago…
                  </>
                ) : (
                  <>
                    <LockKeyhole aria-hidden="true" className="size-4" />
                    Pagar <span className="tabular">{formatCLP(total)}</span>
                  </>
                )}
              </button>
              <p className="text-center text-sm text-ink-2">Pago simulado: se emite una boleta de prueba.</p>
            </form>
          )}
        </div>
      </div>
    </PageFrame>
  );
}
