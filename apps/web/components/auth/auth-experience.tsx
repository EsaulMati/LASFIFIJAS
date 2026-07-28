"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { BackButton } from "@/components/back-button";
import { PasswordVisibilityButton } from "@/components/password-visibility-button";
import { useSound } from "@/components/sound-provider";
import { HoneycombLoader } from "@/components/ui/honeycomb-loader";
import { AuthPattern } from "@/components/auth/auth-pattern";
import { apiFetch, ApiError } from "@/lib/api";
import {
  getPasswordStrength,
  isValidPassword,
  passwordRequirements,
} from "@/lib/password";
import styles from "./auth-experience.module.css";
import {
  getSafeMembershipRedirect,
  parseMembershipPlan,
} from "@/lib/membership-navigation";

export type AuthMode = "login" | "register";
type LoginErrors = Partial<Record<"email" | "password" | "form", string>>;
type RegisterErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthExperience({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const { login, user, loading: sessionLoading } = useAuth();
  const { play } = useSound();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasSwitchedMode, setHasSwitchedMode] = useState(false);
  const loginHeadingRef = useRef<HTMLHeadingElement>(null);
  const registerHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = loginLoading || registerLoading;
  const strength = useMemo(
    () => getPasswordStrength(registerPassword),
    [registerPassword],
  );
  const passwordsMatch =
    confirmPassword.length > 0 && registerPassword === confirmPassword;
  const registerIsValid =
    name.trim().length > 0 &&
    emailPattern.test(registerEmail.trim()) &&
    isValidPassword(registerPassword) &&
    passwordsMatch;
  const redirect =
    typeof window === "undefined"
      ? null
      : getSafeMembershipRedirect(
          new URLSearchParams(window.location.search).get("redirect"),
        );
  const selectedPlan =
    typeof window === "undefined"
      ? null
      : parseMembershipPlan(
          new URLSearchParams(window.location.search).get("plan"),
        );

  useEffect(() => {
    if (sessionLoading || !user) return;
    if (redirect && selectedPlan) {
      router.replace(`/?plan=${encodeURIComponent(selectedPlan)}#membresias`);
      return;
    }
    router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }, [redirect, router, selectedPlan, sessionLoading, user]);

  useEffect(() => {
    const handlePopState = () =>
      setMode(window.location.pathname === "/register" ? "register" : "login");
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  function changeMode(nextMode: AuthMode, allowWhileBusy = false) {
    if ((!allowWhileBusy && busy) || nextMode === mode) return;
    setHasSwitchedMode(true);
    setMode(nextMode);
    window.history.pushState(
      null,
      "",
      `${nextMode === "login" ? "/login" : "/register"}${window.location.search}`,
    );
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    focusTimerRef.current = setTimeout(
      () => {
        (nextMode === "login"
          ? loginHeadingRef
          : registerHeadingRef
        ).current?.focus({ preventScroll: true });
      },
      reducedMotion ? 0 : 690,
    );
  }

  function validateLogin() {
    const nextErrors: LoginErrors = {};
    if (!loginEmail.trim()) nextErrors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(loginEmail.trim()))
      nextErrors.email = "Ingresa un correo electrónico válido";
    if (!loginPassword) nextErrors.password = "Ingresa tu contraseña";
    setLoginErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validateLogin()) return;
    setLoginLoading(true);
    setLoginErrors({});
    try {
      await login(loginEmail.trim(), loginPassword);
      play("success");
      toast.success("Inicio de sesión exitoso", { id: "login-success" });
    } catch (error) {
      const message =
        error instanceof ApiError && error.kind === "credentials"
          ? "El correo o la contraseña son incorrectos"
          : error instanceof Error
            ? error.message
            : "Error al iniciar sesión";
      setLoginErrors({ form: message });
      play("error");
      toast.error(message, { id: "login-error" });
    } finally {
      setLoginLoading(false);
    }
  }

  function validateRegister() {
    const nextErrors: RegisterErrors = {};
    if (!name.trim()) nextErrors.name = "Ingresa tu nombre";
    if (!registerEmail.trim())
      nextErrors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(registerEmail.trim()))
      nextErrors.email = "Ingresa un correo electrónico válido";
    if (!isValidPassword(registerPassword))
      nextErrors.password = "La contraseña debe cumplir todos los requisitos";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirma tu contraseña";
    else if (!passwordsMatch)
      nextErrors.confirmPassword = "Las contraseñas no coinciden";
    setRegisterErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validateRegister()) return;
    setRegisterLoading(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
        }),
      });
      setLoginEmail(registerEmail.trim());
      setLoginPassword("");
      setRegisterPassword("");
      setConfirmPassword("");
      play("success");
      toast.success("Cuenta creada correctamente", { id: "register-success" });
      changeMode("login", true);
    } catch (error) {
      if (error instanceof ApiError && error.kind === "conflict") {
        setRegisterErrors((current) => ({
          ...current,
          email: "Este correo electrónico ya está registrado",
        }));
        play("error");
        toast.error("El correo ya está registrado", {
          id: "register-conflict",
        });
      } else if (error instanceof ApiError && error.kind === "validation") {
        setRegisterErrors((current) => ({
          ...current,
          password: error.message,
        }));
      } else {
        const message =
          error instanceof Error ? error.message : "No se pudo crear la cuenta";
        play("error");
        toast.error(message, { id: "register-error" });
      }
    } finally {
      setRegisterLoading(false);
    }
  }

  if (sessionLoading || user)
    return (
      <main className="grid min-h-screen place-items-center bg-[#030817] text-slate-400">
        <div className="text-center">
          <HoneycombLoader
            className="mx-auto"
            label={user ? "Abriendo tu panel..." : "Comprobando tu sesión..."}
          />
          <p className="mt-6">
            {user ? "Abriendo tu panel…" : "Comprobando tu sesión…"}
          </p>
        </div>
      </main>
    );

  const loginActive = mode === "login";
  return (
    <main className={styles.main}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <div className={styles.authStage}>
        <div className={styles.authLayout}>
          <div className={styles.backRow}>
            <BackButton />
          </div>
        <section
          className={`${styles.shell} ${mode === "register" ? styles.registerMode : ""} ${hasSwitchedMode ? styles.hasSwitchedMode : ""}`}
          aria-label="Acceso a Las Fifijas"
        >
          <aside className={styles.infoPanel} aria-live="polite">
            <AuthPattern />
            <div className={styles.panelGrid} aria-hidden="true" />
            <div className={styles.panelContent} key={mode}>
              <Link href="/" className="mx-auto flex w-fit items-center gap-3">
                <Image src="/logo-lasfifijas.png" alt="Las Fifijas" width={56} height={56} className="h-14 w-14 rounded-full border border-white/15 object-cover" priority />
                <span className="text-xl font-extrabold">LAS<span className="text-emerald-300">FIFIJAS</span></span>
              </Link>
              <div className={styles.panelDesktopCopy}>
                <h2 className="mt-7 text-3xl font-extrabold">{loginActive ? "¿Nuevo por aquí?" : "¿Ya tienes una cuenta?"}</h2>
                <p className="mt-3 leading-7 text-emerald-50/75">
                  {loginActive
                    ? "Crea tu cuenta y lleva tus pronósticos, resultados y membresía en un solo lugar."
                    : "Vuelve a tu panel y continúa siguiendo las selecciones disponibles para tu cuenta."}
                </p>
                <button type="button" disabled={busy} onClick={() => changeMode(loginActive ? "register" : "login")} className="mt-6 min-h-11 rounded-full border border-emerald-200/45 bg-black/15 px-7 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200 disabled:opacity-50">
                  {loginActive ? "Crear cuenta" : "Iniciar sesión"}
                </button>
              </div>
              <div className={styles.mobileSwitch}>
                <p className="mt-3 text-sm text-emerald-50/75">{loginActive ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}</p>
                <button type="button" disabled={busy} onClick={() => changeMode(loginActive ? "register" : "login")} className="mt-1 min-h-11 font-bold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4 disabled:opacity-50">
                  {loginActive ? "Crear una cuenta" : "Ya tengo una cuenta"}
                </button>
              </div>
            </div>
          </aside>

          <section
            className={`${styles.formPane} ${styles.loginPane} ${loginActive ? styles.activePane : styles.hiddenLeft}`}
            aria-hidden={!loginActive}
            inert={!loginActive ? true : undefined}
          >
            <div className={styles.loginIntro}>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">
              Bienvenido de nuevo
            </p>
            <h1
              ref={loginHeadingRef}
              tabIndex={-1}
              className="mt-3 text-3xl font-extrabold outline-none"
            >
              Iniciar sesión
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Accede para consultar tus pronósticos y contenido disponible.
            </p>
            </div>
            <form onSubmit={submitLogin} className={styles.loginForm} noValidate>
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-login-email"
              >
                Correo electrónico
                <input
                  id="auth-login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={busy}
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginErrors((current) => ({
                      ...current,
                      email: undefined,
                      form: undefined,
                    }));
                    play("typing");
                  }}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={Boolean(loginErrors.email)}
                  aria-describedby="login-email-message"
                  className={`${styles.input} mt-2`}
                />
              </label>
              {loginErrors.email && (
                <p id="login-email-message" className={`${styles.loginFieldMessage} text-rose-300`}>
                  {loginErrors.email}
                </p>
              )}
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-login-password"
              >
                Contraseña
                <span className="relative mt-2 block">
                  <input
                    id="auth-login-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={busy}
                    value={loginPassword}
                    onChange={(event) => {
                      setLoginPassword(event.target.value);
                      setLoginErrors((current) => ({
                        ...current,
                        password: undefined,
                        form: undefined,
                      }));
                      play("typing");
                    }}
                    placeholder="Tu contraseña"
                    aria-invalid={Boolean(loginErrors.password)}
                    aria-describedby="login-password-message login-form-error"
                    className={`${styles.input} ${styles.passwordInput}`}
                  />
                  <PasswordVisibilityButton
                    visible={showLoginPassword}
                    onToggle={() => setShowLoginPassword((current) => !current)}
                  />
                </span>
              </label>
              {loginErrors.password && (
                <p id="login-password-message" className={`${styles.loginFieldMessage} text-rose-300`}>
                  {loginErrors.password}
                </p>
              )}
              {loginErrors.form && (
                <div id="login-form-error" role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
                  {loginErrors.form}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                aria-busy={loginLoading || undefined}
                className={styles.submitButton}
              >
                {loginLoading ? (
                  <HoneycombLoader size="small" label="Iniciando sesión..." />
                ) : (
                  "Iniciar sesión"
                )}
              </button>
              <p className="text-center text-sm text-slate-400">
                ¿Aún no tienes cuenta?{" "}
                <button type="button" disabled={busy} onClick={() => changeMode("register")} className="font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
                  Regístrate
                </button>
              </p>
            </form>
          </section>

          <section
            className={`${styles.formPane} ${styles.registerPane} ${!loginActive ? styles.activePane : styles.hiddenRight}`}
            aria-hidden={loginActive}
            inert={loginActive ? true : undefined}
          >
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">
              Únete a la comunidad
            </p>
            <h1
              ref={registerHeadingRef}
              tabIndex={-1}
              className="mt-2 text-3xl font-extrabold outline-none"
            >
              Crear cuenta
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Regístrate con los datos requeridos para acceder a tu panel.
            </p>
            <form
              onSubmit={submitRegister}
              className="mt-5 space-y-3"
              noValidate
            >
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-register-name"
              >
                Nombre
                <input
                  id="auth-register-name"
                  name="name"
                  autoComplete="name"
                  disabled={busy}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setRegisterErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                    play("typing");
                  }}
                  aria-invalid={Boolean(registerErrors.name)}
                  aria-describedby="register-name-message"
                  className={`${styles.input} mt-1.5`}
                />
              </label>
              <p
                id="register-name-message"
                className={`${styles.fieldMessage} ${registerErrors.name ? "text-rose-300" : "text-transparent"}`}
              >
                {registerErrors.name ?? ""}
              </p>
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-register-email"
              >
                Correo electrónico
                <input
                  id="auth-register-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={busy}
                  value={registerEmail}
                  onChange={(event) => {
                    setRegisterEmail(event.target.value);
                    setRegisterErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                    play("typing");
                  }}
                  aria-invalid={Boolean(registerErrors.email)}
                  aria-describedby="register-email-message"
                  className={`${styles.input} mt-1.5`}
                />
              </label>
              <p
                id="register-email-message"
                className={`${styles.fieldMessage} ${registerErrors.email ? "text-rose-300" : "text-transparent"}`}
              >
                {registerErrors.email ?? ""}
              </p>
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-register-password"
              >
                Contraseña
                <span className="relative mt-1.5 block">
                  <input
                    id="auth-register-password"
                    name="new-password"
                    type={showRegisterPassword ? "text" : "password"}
                    autoComplete="new-password"
                    disabled={busy}
                    value={registerPassword}
                    onChange={(event) => {
                      setRegisterPassword(event.target.value);
                      setRegisterErrors((current) => ({
                        ...current,
                        password: undefined,
                      }));
                      play("typing");
                    }}
                    aria-invalid={Boolean(registerErrors.password)}
                    aria-describedby="register-password-message password-strength password-requirements"
                    className={`${styles.input} ${styles.passwordInput}`}
                  />
                  <PasswordVisibilityButton
                    visible={showRegisterPassword}
                    onToggle={() =>
                      setShowRegisterPassword((current) => !current)
                    }
                  />
                </span>
              </label>
              <p
                id="register-password-message"
                className={`${styles.fieldMessage} ${registerErrors.password ? "text-rose-300" : "text-transparent"}`}
              >
                {registerErrors.password ?? ""}
              </p>
              <div id="password-strength" aria-live="polite">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Seguridad</span>
                  <span className="font-bold">
                    {registerPassword ? strength.level.label : "Muy débil"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label="Seguridad de la contraseña"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={strength.score}
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${strength.level.color}`}
                    style={{ width: `${strength.score * 20}%` }}
                  />
                </div>
              </div>
              <ul
                id="password-requirements"
                className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-4"
              >
                {passwordRequirements.map((requirement, index) => (
                  <li
                    key={requirement.key}
                    className={
                      strength.passed[index]
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }
                  >
                    <span aria-hidden="true">
                      {strength.passed[index] ? "✓" : "○"}
                    </span>{" "}
                    {requirement.label}
                  </li>
                ))}
              </ul>
              <label
                className="block text-sm font-semibold text-slate-300"
                htmlFor="auth-confirm-password"
              >
                Confirmar contraseña
                <span className="relative mt-1.5 block">
                  <input
                    id="auth-confirm-password"
                    name="confirm-password"
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    disabled={busy}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setRegisterErrors((current) => ({
                        ...current,
                        confirmPassword: undefined,
                      }));
                      play("typing");
                    }}
                    aria-invalid={
                      Boolean(registerErrors.confirmPassword) ||
                      (confirmPassword.length > 0 && !passwordsMatch)
                    }
                    aria-describedby="register-confirm-message"
                    className={`${styles.input} ${styles.passwordInput}`}
                  />
                  <PasswordVisibilityButton
                    visible={showConfirmation}
                    onToggle={() => setShowConfirmation((current) => !current)}
                    target="confirmación de contraseña"
                  />
                </span>
              </label>
              <p
                id="register-confirm-message"
                className={`${styles.fieldMessage} ${passwordsMatch ? "text-emerald-400" : confirmPassword ? "text-rose-300" : "text-transparent"}`}
              >
                {registerErrors.confirmPassword ??
                  (confirmPassword
                    ? passwordsMatch
                      ? "Las contraseñas coinciden"
                      : "Las contraseñas no coinciden"
                    : "")}
              </p>
              <button
                type="submit"
                disabled={busy || !registerIsValid}
                aria-busy={registerLoading || undefined}
                className={styles.submitButton}
              >
                {registerLoading ? (
                  <HoneycombLoader size="small" label="Registrando..." />
                ) : (
                  "Registrar"
                )}
              </button>
              <p className="text-center text-sm text-slate-400">
                ¿Ya tienes una cuenta?{" "}
                <button type="button" disabled={busy} onClick={() => changeMode("login")} className="font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
                  Inicia sesión
                </button>
              </p>
            </form>
          </section>
        </section>
        </div>
      </div>
    </main>
  );
}
