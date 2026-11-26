"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useRef, Suspense, type FormEvent } from "react";
import { flushSync } from "react-dom";
import {
  useLoginMutation,
  useRegisterMutation,
  logoutRequest,
} from "@/application/hooks/useAuthMutations";
import { safeRedirectPath } from "@/presentation/lib/safeRedirect";
import { retryAfterOf, useCooldown } from "@/presentation/hooks/useCooldown";
import { PASSWORD_POLICY_MESSAGE, isStrongPassword } from "@/presentation/lib/passwordPolicy";
import { ThemeToggle } from "@/presentation/components/theme/ThemeToggle";
import { AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";

const fieldLabel = "mb-1.5 block text-sm font-medium text-ink";
const fieldInput =
  "h-12 w-full rounded-sm bg-bg-elevated px-4 text-[1rem] text-ink ring-1 ring-line-strong ring-inset transition-shadow duration-(--dur-1) ease-out-soft placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60";

// Auth state and handlers below are the former login page's, unchanged; only the markup is new.
function LoginForm() {
  const searchParams = useSearchParams();
  // OWASP A01/A05: solo rutas relativas del mismo origen (bloquea javascript:, //evil.com, etc.).
  const redirectParam = safeRedirectPath(searchParams.get("redirect"));

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<{ email?: string; name?: string } | null>(null);

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  // A07: tras un 429 del backend, el envío queda bloqueado durante Retry-After.
  const cooldown = useCooldown();

  /** Muestra el error y, si es un 429, inicia el bloqueo. */
  function reportError(err: unknown, fallback: string) {
    const wait = retryAfterOf(err);
    if (wait) cooldown.start(wait);
    showToast(err instanceof Error && err.message ? err.message : fallback);
  }

  // Sesión existente: se consulta al BFF (la cookie HttpOnly viaja sola; JS no ve el token).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((userData) => {
        if (!cancelled && typeof userData?.email === "string") {
          setActiveUser({ email: userData.email, name: typeof userData.name === "string" ? userData.name : undefined });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    // 1. Registro en Cognito (POST /api/v1/auth/register a través del BFF). La Lambda PreSignUp del
    //    User Pool confirma la cuenta al crearla: no hay código de verificación y se entra directamente.
    if (authMode === "register") {
      const name = String(data.get("name") || "").trim();
      const confirmPassword = String(data.get("confirm_password") || "");
      if (!name) {
        showToast("Por favor ingresa tu nombre completo.");
        return;
      }
      // Misma política que el User Pool de Cognito.
      if (!email.includes("@") || !isStrongPassword(password)) {
        showToast(PASSWORD_POLICY_MESSAGE);
        return;
      }
      if (password !== confirmPassword) {
        showToast("Las contraseñas no coinciden.");
        return;
      }

      try {
        await registerMutation.mutateAsync({ name, email, password });
      } catch (err: unknown) {
        reportError(err, "Error al registrar usuario en AWS Cognito.");
        return;
      }

      showToast("¡Cuenta creada! Entrando a tu cuenta…");
      try {
        const loginRes = await loginMutation.mutateAsync({ email, password });
        if (loginRes?.authenticated) {
          setTimeout(() => {
            window.location.href = redirectParam;
          }, 600);
          return;
        }
      } catch {
        // La cuenta existe; el usuario puede entrar a mano desde el formulario de login.
      }
      setAuthMode("login");
      showToast("Cuenta creada. Inicia sesión con tu correo y contraseña.");
      return;
    }

    // 2. Flujo de Login (POST /api/v1/auth/login a través del BFF)
    if (!email.includes("@") || password.length < 6) {
      showToast("Ingresa un correo válido y una contraseña de al menos 6 caracteres.");
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({ email, password });
      if (response?.authenticated) {
        showToast("Sesión iniciada con éxito. Entrando…");
        setTimeout(() => {
          window.location.href = redirectParam;
        }, 600);
      }
    } catch (err: unknown) {
      reportError(err, "Error de comunicación con el servidor.");
    }
  }

  // Presentation only: mode switch keeps the keyboard inside the form it opens.
  const firstFieldRef = useRef<HTMLInputElement>(null);

  function switchMode(next: "login" | "register") {
    flushSync(() => {
      setAuthMode(next);
    });
    firstFieldRef.current?.focus();
  }

  const busy = loginMutation.isPending || registerMutation.isPending;
  const blocked = busy || cooldown.active;
  const formError =
    (loginMutation.error as Error | null)?.message ||
    (registerMutation.error as Error | null)?.message ||
    null;
  const errorId = "login-error";
  const describedBy = formError ? errorId : undefined;
  const title = authMode === "login" ? "Iniciar sesión" : "Crear cuenta";
  const storeTarget = redirectParam;

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-8 pt-4 sm:px-6">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="glass-chrome menu-pop fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-pill px-4 py-2.5 text-sm font-medium text-ink"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
          <span className="min-w-0">{toast}</span>
        </div>
      )}

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1 rounded-pill pl-2 pr-4 text-[0.9375rem] font-medium text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:bg-surface-hover hover:text-ink"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Volver a la tienda
        </Link>
        <ThemeToggle />
      </header>

      <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <p className="wordmark font-display-wide text-center text-ink">Nexus</p>

        <section aria-labelledby="login-title" className="glass-raised login-panel mt-6 rounded-xl p-6 sm:p-8">
          <h1 id="login-title" className="font-display-wide text-display-2 font-[760] leading-none text-ink">
            {title}
          </h1>
          <p className="mt-3 text-pretty text-ink-2">
            {authMode === "login"
              ? "Entra para pagar, ver tus pedidos y recuperar tus claves."
              : "Con una cuenta guardas tus pedidos y recibes las claves en tu correo."}
          </p>

          {activeUser && (
            <div className="mt-6 rounded-sm bg-surface-hover p-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-ink">
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
                <span className="min-w-0 [overflow-wrap:anywhere]">Ya entraste como {activeUser.email}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={storeTarget}
                  className="inline-flex h-10 items-center rounded-pill bg-ink px-4 font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98]"
                >
                  Seguir comprando
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutRequest();
                    setActiveUser(null);
                    showToast("Sesión cerrada.");
                  }}
                  className="inline-flex h-10 items-center rounded-pill px-4 font-semibold text-ink ring-1 ring-line-strong ring-inset hover:bg-surface-pressed"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

          <form
            key={authMode}
            aria-label={title}
            onSubmit={handleSubmit}
            noValidate={false}
            className="step-in mt-7 space-y-5"
          >
            {formError && (
              <div
                id={errorId}
                role="alert"
                className="flex items-start gap-2.5 rounded-sm px-4 py-3 text-sm text-danger ring-1 ring-danger ring-inset"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            {authMode === "register" && (
              <div>
                <label htmlFor="input-name" className={fieldLabel}>
                  Nombre completo
                </label>
                <input
                  ref={firstFieldRef}
                  id="input-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={registerMutation.isPending}
                  aria-describedby={describedBy}
                  className={fieldInput}
                />
              </div>
            )}

            <div>
              <label htmlFor="input-email" className={fieldLabel}>
                Correo electrónico
              </label>
              <input
                ref={authMode === "login" ? firstFieldRef : undefined}
                id="input-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loginMutation.isPending || registerMutation.isPending}
                aria-describedby={describedBy}
                className={fieldInput}
              />
            </div>

            <div>
              <label htmlFor="input-password" className={fieldLabel}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  required
                  disabled={loginMutation.isPending || registerMutation.isPending}
                  aria-describedby={[describedBy, "password-hint"].filter(Boolean).join(" ")}
                  className={`${fieldInput} pr-12`}
                />
                <button
                  type="button"
                  aria-label="Mostrar contraseña"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loginMutation.isPending || registerMutation.isPending}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-sm text-ink-2 transition-colors duration-(--dur-1) ease-out-soft hover:text-ink disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              {authMode === "register" ? (
                <p id="password-hint" className="mt-1.5 text-sm text-ink-2">
                  {PASSWORD_POLICY_MESSAGE}
                </p>
              ) : (
                <p id="password-hint" className="mt-1.5 text-sm">
                  <Link
                    href="/recuperar"
                    className="rounded-xs font-medium text-ink-2 underline underline-offset-4 hover:text-ink hover:no-underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </p>
              )}
            </div>

            {authMode === "register" && (
              <div>
                <label htmlFor="input-confirm-password" className={fieldLabel}>
                  Confirmar contraseña
                </label>
                <input
                  id="input-confirm-password"
                  name="confirm_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={registerMutation.isPending}
                  aria-describedby={describedBy}
                  className={fieldInput}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={blocked}
              aria-busy={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink text-[0.9375rem] font-semibold text-bg transition-transform duration-(--dur-1) ease-out-soft active:scale-[0.98] disabled:bg-surface-pressed disabled:text-ink-2"
            >
              {busy ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  Procesando…
                </>
              ) : cooldown.active ? (
                `Espera ${cooldown.remaining} s`
              ) : (
                title
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-2">
            {authMode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              type="button"
              onClick={() => switchMode(authMode === "login" ? "register" : "login")}
              className="rounded-xs font-semibold text-ink underline underline-offset-4 hover:no-underline"
            >
              {authMode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="Cargando" className="flex min-h-dvh items-center justify-center">
          <div className="skeleton h-96 w-full max-w-md rounded-xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
