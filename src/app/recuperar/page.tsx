"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/application/hooks/useAuthMutations";
import { retryAfterOf, useCooldown } from "@/presentation/hooks/useCooldown";
import { PASSWORD_POLICY_MESSAGE, isStrongPassword } from "@/presentation/lib/passwordPolicy";
import { ThemeToggle } from "@/presentation/components/theme/ThemeToggle";

const fieldLabel = "mb-1.5 block text-sm font-medium text-ink";
const fieldInput =
  "h-12 w-full rounded-sm bg-bg-elevated px-4 text-[1rem] text-ink ring-1 ring-line-strong ring-inset transition-shadow duration-(--dur-1) ease-out-soft placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60";
const primaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink text-[0.9375rem] font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98] disabled:bg-surface-pressed disabled:text-ink-2";

/** Mismo texto exista o no la cuenta (OWASP A07: sin enumeración de usuarios). */
const UNIFORM_SENT = "Si la cuenta existe, recibirás un código de verificación en tu correo.";

type Step = "request" | "reset" | "done";

/**
 * Recuperación de contraseña en dos pasos, siempre a través del BFF:
 * 1. correo → POST /api/v1/auth/forgot-password (respuesta uniforme);
 * 2. código + nueva contraseña → POST /api/v1/auth/reset-password.
 * El correo vive solo en el estado del componente: nunca en la URL (no queda en logs ni historial).
 */
export default function RecoverPage() {
  const forgot = useForgotPasswordMutation();
  const reset = useResetPasswordMutation();
  const cooldown = useCooldown();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const busy = forgot.isPending || reset.isPending;
  const blocked = busy || cooldown.active;

  /** Un 429 inicia el bloqueo; cualquier otro error se muestra con un mensaje genérico. */
  function handleError(err: unknown, fallback: string): boolean {
    const wait = retryAfterOf(err);
    if (wait) {
      cooldown.start(wait);
      setError(err instanceof Error && err.message ? err.message : "Demasiados intentos. Inténtalo más tarde.");
      return true;
    }
    setError(fallback);
    return false;
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = String(new FormData(event.currentTarget).get("email") || "").trim().toLowerCase();
    if (!value.includes("@")) {
      setError("Ingresa un correo válido.");
      return;
    }
    try {
      await forgot.mutateAsync({ email: value });
    } catch (err: unknown) {
      // Solo el 429 se informa como tal; el resto no debe revelar si la cuenta existe.
      if (handleError(err, "")) return;
      setError(null);
    }
    setEmail(value);
    setNotice(UNIFORM_SENT);
    flushSync(() => setStep("reset"));
    codeRef.current?.focus();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") || "").trim();
    const password = String(data.get("password") || "");
    if (!/^[0-9]{4,10}$/.test(code)) {
      setError("Escribe el código numérico que recibiste por correo.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    try {
      await reset.mutateAsync({ email, confirmation_code: code, new_password: password });
      setNotice(null);
      setStep("done");
    } catch (err: unknown) {
      handleError(err, "No pudimos cambiar la contraseña. Revisa el código o solicita uno nuevo.");
    }
  }

  const title = step === "done" ? "Contraseña actualizada" : "Recuperar contraseña";
  const errorId = "recover-error";

  const submitLabel = (idle: string) =>
    busy ? (
      <>
        <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        Procesando…
      </>
    ) : cooldown.active ? (
      `Espera ${cooldown.remaining} s`
    ) : (
      idle
    );

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center gap-1 rounded-pill pl-2 pr-4 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Volver a iniciar sesión
        </Link>
        <ThemeToggle />
      </header>

      <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <p className="wordmark font-display-wide text-center text-ink">Nexus</p>

        <section aria-labelledby="recover-title" className="glass-raised login-panel mt-6 rounded-xl p-6 sm:p-8">
          <h1 id="recover-title" className="font-display-wide text-display-2 font-[760] leading-none text-ink">
            {title}
          </h1>
          <p className="mt-3 text-pretty text-ink-2">
            {step === "request"
              ? "Te enviaremos un código para elegir una contraseña nueva."
              : step === "reset"
              ? "Escribe el código que te enviamos y tu nueva contraseña."
              : "Ya puedes entrar con tu nueva contraseña."}
          </p>

          {notice && (
            <p role="status" className="mt-6 flex items-start gap-2.5 rounded-sm bg-surface-hover p-4 text-sm text-ink">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{notice}</span>
            </p>
          )}

          {error && (
            <div
              id={errorId}
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-sm px-4 py-3 text-sm text-danger ring-1 ring-danger ring-inset"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {step === "request" && (
            <form aria-label="Solicitar código" onSubmit={requestCode} className="step-in mt-7 space-y-5">
              <div>
                <label htmlFor="recover-email" className={fieldLabel}>
                  Correo electrónico
                </label>
                <input
                  id="recover-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  disabled={busy}
                  aria-describedby={error ? errorId : undefined}
                  className={fieldInput}
                />
              </div>
              <button type="submit" disabled={blocked} aria-busy={busy} className={primaryButton}>
                {submitLabel("Enviar código")}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form aria-label="Cambiar contraseña" onSubmit={resetPassword} className="step-in mt-7 space-y-5">
              <div>
                <label htmlFor="recover-code" className={fieldLabel}>
                  Código de verificación
                </label>
                <input
                  ref={codeRef}
                  id="recover-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={10}
                  disabled={busy}
                  placeholder="123456"
                  className={`${fieldInput} tabular text-center font-mono text-lg tracking-[0.3em]`}
                />
              </div>
              <div>
                <label htmlFor="recover-password" className={fieldLabel}>
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="recover-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    maxLength={256}
                    disabled={busy}
                    aria-describedby="recover-password-hint"
                    className={`${fieldInput} pr-12`}
                  />
                  <button
                    type="button"
                    aria-label="Mostrar contraseña"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-sm text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:text-ink"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
                <p id="recover-password-hint" className="mt-1.5 text-sm text-ink-2">
                  {PASSWORD_POLICY_MESSAGE}
                </p>
              </div>
              <button type="submit" disabled={blocked} aria-busy={busy} className={primaryButton}>
                {submitLabel("Cambiar contraseña")}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={() => {
                  setStep("request");
                  setNotice(null);
                  setError(null);
                }}
                className="w-full rounded-xs text-sm font-semibold text-ink underline underline-offset-4 hover:no-underline disabled:opacity-50"
              >
                Solicitar otro código
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="step-in mt-7">
              <Link href="/login" className={primaryButton}>
                Iniciar sesión
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
