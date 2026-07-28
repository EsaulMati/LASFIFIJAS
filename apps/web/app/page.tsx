"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LandingMotion } from "@/components/landing-motion";
import { HoneycombLoader } from "@/components/ui/honeycomb-loader";
import { AnimatedActionButton } from "@/components/ui/animated-action-button";
import { PaymentDemoModal } from "@/components/payment/payment-demo-modal";
import {
  getMembershipPlan,
  membershipPlans,
  type MembershipPlanDetails,
} from "@/lib/membership-plans";
import membershipStyles from "./membership-actions.module.css";
import { apiFetch, isCancelledRequest } from "@/lib/api";
import {
  createMembershipLoginUrl,
  parseMembershipPlan,
} from "@/lib/membership-navigation";

type PredictionStatus = "PENDING" | "WON" | "LOST" | "VOID";
type ResultStatus = Exclude<PredictionStatus, "PENDING">;

type Prediction = {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string | null;
  odds: number;
  matchDate: string;
  isPremium: boolean;
  status: PredictionStatus;
};

const resultStatusLabels: Record<ResultStatus, string> = {
  WON: "Ganado",
  LOST: "Perdido",
  VOID: "Anulado",
};

const resultStatusStyles: Record<ResultStatus, string> = {
  WON: "bg-emerald-400/10 text-emerald-400",
  LOST: "bg-red-400/10 text-red-400",
  VOID: "bg-slate-400/10 text-slate-300",
};

function getTimeRemaining(date: string) {
  const now = new Date().getTime();
  const target = new Date(date).getTime();
  const difference = target - now;

  if (Number.isNaN(target)) {
    return "Próximamente";
  }

  if (difference <= 0) {
    return "Partido iniciado";
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));

  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatResultDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function Page() {
  const { user, loading: authLoading, logout } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPlan, setSelectedPlan] =
    useState<MembershipPlanDetails | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);

  const loadPredictions = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setLoadError("");
      if (authLoading) return;
      const data = await apiFetch<Prediction[]>(
        user ? "/predictions/my" : "/predictions",
        { signal },
      );
      setPredictions(data);
    } catch (error) {
      if (isCancelledRequest(error)) return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los pronósticos",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadPredictions(controller.signal));
    return () => controller.abort();
  }, [loadPredictions]);

  useEffect(() => {
    const updateNavbar = () => setNavScrolled(window.scrollY > 24);
    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });
    return () => window.removeEventListener("scroll", updateNavbar);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    const plan = parseMembershipPlan(
      new URLSearchParams(window.location.search).get("plan"),
    );
    if (!plan) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedPlan(getMembershipPlan(plan));
      window.history.replaceState(null, "", "/#membresias");
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const pendingPredictions = predictions.filter(
    (item) => item.status === "PENDING",
  );
  const resultPredictions = predictions.filter(
    (item): item is Prediction & { status: ResultStatus } =>
      item.status !== "PENDING",
  );

  return (
    <LandingMotion
      refreshKey={`${loading}-${pendingPredictions.length}-${resultPredictions.length}`}
    >
      <main className="min-h-screen bg-[#030817] text-white">
        {/* NAVBAR */}

        <nav
          className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${navScrolled ? "border-b border-white/10 bg-[#030817]/78 shadow-lg shadow-black/15 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <a href="#" className="flex items-center gap-3">
              <Image
                src="/logo-lasfifijas.png"
                alt="Logo Las Fifijas"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                priority
              />

              <span className="brand-text text-xl font-black tracking-tight">
                LAS
                <span className="text-emerald-400">FIFIJAS</span>
              </span>
            </a>

            <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
              <a
                href="#pronosticos"
                className="transition hover:text-emerald-400"
              >
                Pronósticos
              </a>

              <a href="#membresias" className="transition hover:text-emerald-400">
                Membresías
              </a>

              {user && (
                <a
                  href="#resultados"
                  className="transition hover:text-emerald-400"
                >
                  Resultados
                </a>
              )}
            </div>

            <div className="flex min-w-32 items-center justify-end gap-3">
              {!authLoading && user && (
                <>
                  <a
                    href="#"
                    className="hidden text-sm font-semibold text-slate-300 sm:inline"
                  >
                    Inicio
                  </a>
                  <a
                    href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-400"
                  >
                    {user.role === "ADMIN" ? "Administración" : "Mi panel"}
                  </a>
                  <button
                    onClick={() => void logout()}
                    className="hidden text-sm text-slate-400 hover:text-white lg:inline"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
              {!authLoading && !user && (
                <>
                  <a
                    href="/login"
                    className="text-sm font-semibold text-slate-300 hover:text-white"
                  >
                    Iniciar sesión
                  </a>
                  <a
                    href="/register"
                    className="hidden rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 sm:inline"
                  >
                    Crear cuenta
                  </a>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* HERO */}

        <section data-hero className="relative overflow-hidden bg-[#030817]">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/videos/video-landing-gol.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#030817]/75 via-[#030817]/70 to-[#030817]/95" />
          <div
            data-hero-glow
            className="absolute left-1/2 top-20 z-[1] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px] will-change-transform"
          />

          <div className="relative z-10 mx-auto flex max-w-7xl -translate-y-4 flex-col items-center px-6 pb-16 pt-20 text-center md:pb-20 md:pt-24">
            <div
              data-hero-item
              className="mb-5 mt-4 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-sm font-medium text-emerald-300 md:mt-6"
            >
              Análisis deportivo · Pronósticos · Comunidad
            </div>

            <h1
              data-hero-item
              className="max-w-5xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl"
            >
              Más análisis.
              <br />
              Mejores decisiones.
              <br />
              <span className="text-emerald-400">Las Fifijas.</span>
            </h1>

            <p
              data-hero-item
              className="mt-7 max-w-2xl text-base leading-7 text-slate-400 md:text-lg"
            >
              Accede a pronósticos deportivos, análisis de partidos y contenido
              exclusivo preparado para nuestra comunidad.
            </p>

            <div
              data-hero-item
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <a
                href="#pronosticos"
                className="rounded-full bg-emerald-400 px-8 py-4 font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Ver pronósticos
              </a>

              <a
                href="#membresias"
                className="rounded-full border border-white/15 bg-white/5 px-8 py-4 font-bold transition hover:border-white/30 hover:bg-white/10"
              >
                Ver membresías
              </a>
            </div>
          </div>
        </section>

        {/* MEMBRESÍAS */}

        <section
          id="membresias"
          data-reveal-section
          className="scroll-mt-24 border-y border-white/10 bg-white/[0.02]"
        >
          <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
            <div
              data-reveal-heading
              className="mx-auto mb-6 max-w-2xl text-center"
            >
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
                Membresías Premium
              </p>

              <h2 className="text-3xl font-black md:text-4xl">
                Elige tu membresía
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Accede a todos los pronósticos y contenido Premium de Las
                Fifijas durante el tiempo que prefieras.
              </p>
            </div>

            <div
              className={`${membershipStyles.membershipGrid} grid gap-4 md:grid-cols-2 xl:grid-cols-4`}
            >
              {membershipPlans.map((plan) => (
                <article
                  data-reveal-card
                  key={plan.title}
                  className={`${membershipStyles.membershipCard} relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[1.5rem] border p-5 shadow-xl shadow-black/20 hover:shadow-emerald-950/40 ${
                    plan.recommended
                      ? "border-emerald-400/60 bg-gradient-to-b from-emerald-400/20 via-[#101c2c] to-[#0b1224]"
                      : "border-white/15 bg-gradient-to-b from-slate-800/90 to-[#0b1224] hover:border-emerald-400/40"
                  }`}
                >
                  {plan.recommended && (
                    <>
                      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />

                      <span className="relative mb-3 w-fit rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-950">
                        Recomendado
                      </span>
                    </>
                  )}

                  <div className="relative flex flex-1 flex-col">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                      Las Fifijas Premium
                    </p>

                    <h3 className="mt-2 text-3xl font-black">{plan.title}</h3>

                    <p className="mt-2 text-sm text-slate-500">
                      {plan.duration}
                    </p>

                    <div className="my-4 h-px bg-white/10" />

                    <p className="min-h-[60px] text-[13px] leading-5 text-slate-400">
                      {plan.description}
                    </p>

                    <ul className="mt-4 space-y-1.5 text-[13px] leading-5 text-slate-300">
                      <li>✓ Pronósticos Premium</li>

                      <li>✓ Todos los análisis</li>

                      <li>✓ Contenido exclusivo</li>

                      <li>✓ Acceso completo</li>
                    </ul>

                    <div className="mt-auto pt-4">
                      <p className="mb-3 text-sm font-semibold text-slate-500">
                        Precio por confirmar
                      </p>

                      <AnimatedActionButton
                        fullWidth
                        disabled={authLoading}
                        onClick={() => {
                          if (authLoading) return;
                          if (!user) {
                            window.location.assign(
                              createMembershipLoginUrl(plan.plan),
                            );
                            return;
                          }
                          setSelectedPlan(plan);
                        }}
                      >
                        Elegir membresía
                      </AnimatedActionButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-6 text-slate-500">
              Los precios y métodos de pago serán mostrados antes de completar
              la activación de la membresía.
            </p>
          </div>
        </section>

        {/* PRONÓSTICOS */}

        <section
          id="pronosticos"
          data-reveal-section
          className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 md:py-24"
        >
          <div
            data-reveal-heading
            className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"
          >
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
                Próximos eventos
              </p>

              <h2 className="text-4xl font-black md:text-5xl">
                Próximos pronósticos
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-slate-400">
              Revisa nuestros próximos análisis y descubre cuánto falta para
              cada partido.
            </p>
          </div>

          {loading ? (
            <div
              data-reveal-card
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-slate-400"
            >
              <HoneycombLoader
                className="mx-auto"
                label="Cargando pronósticos..."
              />
              <p className="mt-5">Cargando pronósticos...</p>
            </div>
          ) : loadError ? (
            <div
              data-reveal-card
              className="rounded-3xl border border-rose-400/25 bg-rose-400/[0.06] p-10 text-center"
            >
              <h3 className="text-xl font-bold text-rose-200">
                No pudimos cargar los pronósticos
              </h3>
              <p className="mt-2 text-sm text-slate-400">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadPredictions()}
                className="mt-6 min-h-11 rounded-full border border-rose-300/30 px-5 font-bold text-rose-200 transition hover:bg-rose-300/10"
              >
                Reintentar
              </button>
            </div>
          ) : pendingPredictions.length === 0 ? (
            <div
              data-reveal-card
              className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-16 text-center"
            >
              <div className="text-5xl">⚽</div>

              <h3 className="mt-5 text-2xl font-bold">
                Nuevos pronósticos próximamente
              </h3>

              <p className="mt-3 text-slate-400">
                Estamos preparando las próximas Fifijas.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingPredictions.map((item) => (
                <article
                  data-reveal-card
                  key={item.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1224] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40"
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      {item.sport}
                    </span>

                    {item.isPremium ? (
                      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-400">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        GRATIS
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-slate-500">{item.league}</p>

                    <h3 className="mt-4 text-2xl font-black">
                      {item.homeTeam}
                    </h3>

                    <p className="my-1 text-sm font-bold text-slate-600">VS</p>

                    <h3 className="text-2xl font-black">{item.awayTeam}</h3>

                    <div className="mt-7 rounded-2xl bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Comienza en
                      </p>

                      <p className="mt-1 text-xl font-black text-emerald-400">
                        {getTimeRemaining(item.matchDate)}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Cuota</p>

                        <p className="mt-1 text-xl font-black">{item.odds}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Pronóstico</p>

                        <p className="mt-1 font-bold">
                          {item.isPremium
                            ? "🔒 Contenido Premium"
                            : item.prediction}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* RESULTADOS */}

        {user && (
        <section
          id="resultados"
          data-reveal-section
          className="scroll-mt-24 border-y border-white/10 bg-[#071020]"
        >
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div data-reveal-heading className="text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
                Transparencia
              </p>

              <h2 className="text-4xl font-black md:text-5xl">
                Nuestros resultados
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-slate-400">
                Consulta el historial de nuestros pronósticos y conoce sus
                resultados.
              </p>
            </div>

            {loading ? (
              <div
                data-reveal-card
                className="mt-14 rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center text-slate-400"
              >
                <HoneycombLoader
                  className="mx-auto"
                  label="Cargando resultados..."
                />
                <p className="mt-5">Cargando resultados...</p>
              </div>
            ) : loadError ? (
              <div
                data-reveal-card
                className="mt-14 rounded-3xl border border-rose-400/25 bg-rose-400/[0.06] p-10 text-center"
              >
                <p className="font-bold text-rose-200">
                  Los resultados no están disponibles en este momento.
                </p>
                <button
                  type="button"
                  onClick={() => void loadPredictions()}
                  className="mt-5 min-h-11 rounded-full border border-rose-300/30 px-5 font-bold text-rose-200"
                >
                  Reintentar
                </button>
              </div>
            ) : resultPredictions.length === 0 ? (
              <div
                data-reveal-card
                className="mt-14 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-16 text-center"
              >
                <div className="text-5xl">📊</div>

                <h3 className="mt-5 text-2xl font-bold">
                  Todavía no hay resultados registrados
                </h3>

                <p className="mt-3 text-slate-400">
                  Los resultados aparecerán aquí cuando finalicen los eventos.
                </p>
              </div>
            ) : (
              <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {resultPredictions.map((item) => (
                  <article
                    data-reveal-card
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {item.sport}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${resultStatusStyles[item.status]}`}
                      >
                        {resultStatusLabels[item.status]}
                      </span>
                    </div>

                    <p className="mt-5 text-sm text-slate-500">{item.league}</p>

                    <h3 className="mt-3 text-xl font-black">
                      {item.homeTeam} vs {item.awayTeam}
                    </h3>

                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Cuota
                        </p>
                        <p className="mt-1 text-xl font-black">{item.odds}</p>
                      </div>

                      <p className="text-right text-sm text-slate-400">
                        {formatResultDate(item.matchDate)}
                      </p>
                    </div>

                    {!item.isPremium && item.prediction && (
                      <div className="mt-5 rounded-2xl bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Pronóstico
                        </p>
                        <p className="mt-2 font-semibold">{item.prediction}</p>
                      </div>
                    )}

                    {item.isPremium && (
                      <p className="mt-5 text-sm font-semibold text-amber-400">
                        🔒 Resultado de contenido Premium
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        {/* CTA */}

        <section
          data-reveal-section
          className="mx-auto max-w-7xl px-6 py-20 md:py-24"
        >
          <div
            data-reveal-card
            className="relative overflow-hidden rounded-[2.5rem] border border-emerald-400/20 bg-gradient-to-r from-emerald-400/10 via-[#0b1224] to-[#0b1224] px-8 py-20 text-center transition-transform duration-500 hover:-translate-y-1"
          >
            <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
                LASFIFIJAS Premium
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black md:text-6xl">
                Desbloquea todas las Fifijas.
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-slate-400">
                Elige la membresía que más se adapte a ti y accede a nuestro
                contenido exclusivo.
              </p>

              <a
                href="#membresias"
                className="mt-9 inline-block rounded-full bg-emerald-400 px-9 py-4 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Ver membresías
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-lasfifijas.png"
                alt="Logo Las Fifijas"
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover"
              />

              <div>
                <p className="text-xl font-black">
                  LAS
                  <span className="text-emerald-400">FIFIJAS</span>
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Pronósticos y análisis deportivos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white">
                Términos
              </a>

              <a href="#" className="hover:text-white">
                Privacidad
              </a>

              <a href="#" className="hover:text-white">
                Contacto
              </a>
            </div>

            <p className="text-sm text-slate-600">© 2026 LASFIFIJAS</p>
          </div>
        </footer>
        <PaymentDemoModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      </main>
    </LandingMotion>
  );
}
