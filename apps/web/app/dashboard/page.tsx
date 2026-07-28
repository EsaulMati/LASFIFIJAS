"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedPage, useAuth } from "@/components/auth-provider";
import { apiFetch, isCancelledRequest } from "@/lib/api";
import { Membership, MembershipPlan, MembershipStatus } from "@/lib/types";
import { toastRequestError } from "@/lib/toast-error";
import { BackButton } from "@/components/back-button";
import { AnimatedActionButton } from "@/components/ui/animated-action-button";
import { HoneycombLoader } from "@/components/ui/honeycomb-loader";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { calculateAccuracy } from "@/lib/prediction-metrics";

type PredictionStatus = "PENDING" | "WON" | "LOST" | "VOID";
type PredictionFilter =
  "ALL" | "UPCOMING" | "HISTORY" | "WON" | "LOST" | "VOID";

type Prediction = {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  matchDate: string;
  isPremium: boolean;
  status: PredictionStatus;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}

const planLabels: Record<MembershipPlan, string> = {
  ONE_MONTH: "Plan de 1 mes",
  THREE_MONTHS: "Plan de 3 meses",
  SIX_MONTHS: "Plan de 6 meses",
  TWELVE_MONTHS: "Plan de 12 meses",
};

const statusLabels: Record<MembershipStatus, string> = {
  ACTIVE: "Activa",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

function membershipProgress(membership: Membership) {
  const start = new Date(membership.startDate).getTime();
  const end = new Date(membership.endDate).getTime();
  const now = Date.now();
  const progress = Math.min(
    100,
    Math.max(0, ((now - start) / (end - start)) * 100),
  );
  const active =
    membership.status === "ACTIVE" && start <= now && end > now;
  const remainingDays = active
    ? Math.max(0, Math.ceil((end - now) / 86_400_000))
    : 0;
  return { progress, remainingDays };
}

function DashboardContent() {
  const { user, logout, refreshUser } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<PredictionFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [now, setNow] = useState<Date | null>(null);
  const retryPredictionsRef = useRef<() => void>(() => undefined);
  const predictionRequestRef = useRef(0);
  const membershipAccessKey = user?.membership
    ? `${user.membership.status}:${user.membership.startDate}:${user.membership.endDate}`
    : "none";

  const loadPredictions = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++predictionRequestRef.current;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch<Prediction[]>("/predictions/my", { signal });
      if (requestId === predictionRequestRef.current) setPredictions(data);
    } catch (error) {
      if (isCancelledRequest(error)) return;
      if (requestId !== predictionRequestRef.current) return;
      setError(
        error instanceof Error
          ? error.message
          : "Error al cargar los pronósticos",
      );
      toastRequestError(
        error,
        "dashboard-load-error",
        "Error al cargar los pronósticos",
        () => retryPredictionsRef.current(),
      );
    } finally {
      if (!signal?.aborted && requestId === predictionRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    retryPredictionsRef.current = () => void loadPredictions();
  }, [loadPredictions]);
  useEffect(() => {
    const refreshMembership = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    window.addEventListener("focus", refreshMembership);
    document.addEventListener("visibilitychange", refreshMembership);
    const interval = window.setInterval(refreshMembership, 15_000);
    return () => {
      window.removeEventListener("focus", refreshMembership);
      document.removeEventListener("visibilitychange", refreshMembership);
      window.clearInterval(interval);
    };
  }, [refreshUser]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadPredictions(controller.signal));
    return () => controller.abort();
  }, [loadPredictions, membershipAccessKey]);
  useEffect(() => {
    queueMicrotask(() => setNow(new Date()));
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const membership = user?.membership ?? null;
  const membershipData = membership ? membershipProgress(membership) : null;

  const filteredPredictions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return predictions.filter((item) => {
      const matchesStatus =
        filter === "ALL"
          ? true
          : filter === "UPCOMING"
            ? item.status === "PENDING"
            : filter === "HISTORY"
              ? item.status !== "PENDING"
              : item.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        [item.sport, item.league, item.homeTeam, item.awayTeam].some((value) =>
          value.toLocaleLowerCase("es").includes(normalizedQuery),
        );
      const matchesSport = sportFilter === "ALL" || item.sport === sportFilter;
      return matchesStatus && matchesQuery && matchesSport;
    });
  }, [filter, predictions, query, sportFilter]);
  const sports = useMemo(
    () =>
      [...new Set(predictions.map((item) => item.sport))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [predictions],
  );
  const filterOptions: Array<{
    value: PredictionFilter;
    label: string;
    count: number;
  }> = [
    { value: "ALL", label: "Todos", count: predictions.length },
    {
      value: "UPCOMING",
      label: "Próximos",
      count: predictions.filter((item) => item.status === "PENDING").length,
    },
    {
      value: "HISTORY",
      label: "Historial",
      count: predictions.filter((item) => item.status !== "PENDING").length,
    },
    {
      value: "WON",
      label: "Ganados",
      count: predictions.filter((item) => item.status === "WON").length,
    },
    {
      value: "LOST",
      label: "Perdidos",
      count: predictions.filter((item) => item.status === "LOST").length,
    },
    {
      value: "VOID",
      label: "Anulados",
      count: predictions.filter((item) => item.status === "VOID").length,
    },
  ];
  const pendingCount = predictions.filter(
    (item) => item.status === "PENDING",
  ).length;
  const wonCount = predictions.filter((item) => item.status === "WON").length;
  const accuracy = calculateAccuracy(predictions);
  const featured = [...predictions]
    .filter(
      (item) =>
        item.status === "PENDING" &&
        (!now || new Date(item.matchDate).getTime() >= now.getTime()),
    )
    .sort(
      (a, b) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime(),
    )[0];
  const recentActivity = [...predictions]
    .sort(
      (a, b) =>
        new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
    )
    .slice(0, 4);
  const greeting = now
    ? now.getHours() < 12
      ? "Buenos días"
      : now.getHours() < 19
        ? "Buenas tardes"
        : "Buenas noches"
    : "Hola";
  const currentDate = now
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : "";
  const statusTone = (status: PredictionStatus) =>
    status === "WON"
      ? "success"
      : status === "LOST"
        ? "danger"
        : status === "PENDING"
          ? "warning"
          : "neutral";

  return (
    <main className="min-h-screen bg-[#030817] text-white">
      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#030817]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-lasfifijas.png"
              alt="Logo Las Fifijas"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border border-white/10 object-cover"
              priority
            />

            <span className="text-xl font-black tracking-tight">
              LAS
              <span className="text-emerald-400">FIFIJAS</span>
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <BackButton label="Volver" className="hidden sm:inline-flex" />
            {user?.name && (
              <span className="hidden text-sm text-slate-400 sm:block">
                Hola,{" "}
                <span className="font-semibold text-white">{user.name}</span>
              </span>
            )}

            <button
              onClick={logout}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-400"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* HEADER */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute left-1/2 top-0 h-[350px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <p className="text-sm font-bold capitalize text-emerald-400">
            {currentDate || "Mi cuenta"}
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            {greeting}
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-slate-400">
            Aquí encontrarás los pronósticos disponibles según el acceso de tu
            cuenta y membresía.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Disponibles"
              value={loading ? "—" : predictions.length}
              hint="Según tu acceso actual"
            />
            <MetricCard
              label="Pendientes"
              value={loading ? "—" : pendingCount}
              hint="Próximos eventos"
            />
            <MetricCard
              label="Ganados"
              value={loading ? "—" : wonCount}
              hint="Resultados disponibles"
            />
            <MetricCard
              label="Días restantes"
              value={membershipData?.remainingDays ?? 0}
              hint={membership ? "De tu membresía" : "Sin membresía activa"}
            />
            {accuracy !== null && (
              <MetricCard
                label="Acierto decidido"
                value={`${accuracy}%`}
                hint="Excluye pendientes y anulados"
              />
            )}
          </div>
        </div>
      </section>

      <section
        id="membership"
        className="mx-auto w-full max-w-7xl scroll-mt-28 px-6 pt-12"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#101b2d] to-[#0b1224] p-6 shadow-xl shadow-black/20 transition hover:border-emerald-400/25 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                Membresía
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {membership ? planLabels[membership.plan] : "Sin membresía"}
              </h2>
              <span
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${membership?.status === "ACTIVE" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : membership?.status === "CANCELLED" ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}
              >
                {membership ? statusLabels[membership.status] : "Sin membresía"}
              </span>
              <p className="mt-2 text-slate-400">
                {membership
                  ? `Estado: ${statusLabels[membership.status]}`
                  : "Activa una membresía para acceder a todos los pronósticos Premium."}
              </p>
            </div>
            {membership && (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Inicio</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDate(membership.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Vencimiento</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDate(membership.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Días restantes</dt>
                  <dd className="mt-1 font-semibold">
                    {membershipData?.remainingDays ?? 0}
                  </dd>
                </div>
              </dl>
            )}
          </div>
          {membership && membershipData && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>Tiempo consumido</span>
                <span>{Math.round(membershipData.progress)}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Tiempo consumido de la membresía"
                aria-valuenow={Math.round(membershipData.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width]"
                  style={{ width: `${membershipData.progress}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-6 max-w-xs">
            {membership ? (
              <AnimatedActionButton
                fullWidth
                href="/#membresias"
              >
                {membership.status === "ACTIVE"
                  ? "Renovar membresía"
                  : "Elegir membresía"}
              </AnimatedActionButton>
            ) : (
              <AnimatedActionButton href="/#membresias">
                Ver planes
              </AnimatedActionButton>
            )}
          </div>
        </div>
      </section>

      {featured && (
        <section className="mx-auto max-w-7xl px-6 pt-12">
          <article className="relative overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-400/10 via-[#101b2d] to-[#080e1d] p-7 shadow-2xl shadow-emerald-950/20 md:p-9">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <StatusBadge label="PRÓXIMO" tone="warning" />
                <p className="mt-5 text-sm font-bold uppercase tracking-wider text-emerald-300">
                  {featured.sport} · {featured.league}
                </p>
                <h2 className="mt-3 text-3xl font-extrabold">
                  {featured.homeTeam} <span className="text-slate-500">vs</span>{" "}
                  {featured.awayTeam}
                </h2>
                <p className="mt-3 text-slate-400">
                  {formatDate(featured.matchDate)}
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pronóstico
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {featured.prediction}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-6 py-5 text-center">
                <p className="text-xs uppercase text-slate-400">Cuota</p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-300">
                  {featured.odds.toFixed(2)}
                </p>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* PRONÓSTICOS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            Selecciones
          </p>

          <h2 className="mt-3 text-3xl font-black">Pronósticos disponibles</h2>
        </div>

        <div className="mb-8 space-y-4">
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            role="tablist"
            aria-label="Filtrar pronósticos"
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${filter === option.value ? "border-emerald-400/50 bg-emerald-400 text-slate-950" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-400/30 hover:text-white"}`}
              >
                {option.label}{" "}
                <span className="ml-1 opacity-70">{option.count}</span>
              </button>
            ))}
          </div>
          {sports.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Filtrar por deporte"
            >
              <button
                type="button"
                onClick={() => setSportFilter("ALL")}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${sportFilter === "ALL" ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-slate-400"}`}
              >
                Todos los deportes
              </button>
              {sports.map((sport) => (
                <button
                  type="button"
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${sportFilter === sport ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-slate-400"}`}
                >
                  {sport}
                </button>
              ))}
            </div>
          )}
          <label className="block max-w-md">
            <span className="sr-only">Buscar por deporte, liga o equipo</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar deporte, liga o equipo..."
              className="w-full rounded-2xl border border-white/10 bg-[#0b1224] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>
        </div>

        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-20 text-center">
            <HoneycombLoader
              className="mx-auto"
              label="Cargando pronósticos..."
            />
            <p className="mt-6 text-slate-400">Preparando tus pronósticos…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            <p>{error}</p>
            <button
              onClick={() => void loadPredictions()}
              className="mt-4 rounded-full border border-red-400/40 px-4 py-2 font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filteredPredictions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-16 text-center">
            <div className="text-5xl">⚽</div>

            <h3 className="mt-5 text-2xl font-bold">
              No hay pronósticos para este filtro
            </h3>

            <p className="mx-auto mt-3 max-w-md text-slate-400">
              Prueba otra categoría o cambia el texto de búsqueda.
            </p>

            <Link
              href="/#membresias"
              className="mt-8 inline-block rounded-full bg-emerald-400 px-7 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"
            >
              Ver membresías
            </Link>
          </div>
        )}

        {!loading && !error && filteredPredictions.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPredictions.map((item, index) => (
              <article
                key={item.id}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                className="dashboard-card-enter group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1224] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-950/20"
              >
                {/* CARD HEADER */}

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
                  <StatusBadge
                    label={
                      item.status === "PENDING"
                        ? "Pendiente"
                        : item.status === "WON"
                          ? "Ganado"
                          : item.status === "LOST"
                            ? "Perdido"
                            : "Anulado"
                    }
                    tone={statusTone(item.status)}
                  />
                </div>

                {/* CARD BODY */}

                <div className="p-6">
                  <p className="text-sm text-slate-500">{item.league}</p>

                  <div className="mt-5">
                    <h3 className="text-2xl font-black">{item.homeTeam}</h3>

                    <p className="my-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                      VS
                    </p>

                    <h3 className="text-2xl font-black">{item.awayTeam}</h3>
                  </div>

                  <div className="mt-7 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Pronóstico
                    </p>

                    <p className="mt-3 text-lg font-bold leading-7">
                      {item.prediction}
                    </p>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Cuota
                      </p>

                      <p className="mt-1 text-2xl font-black text-emerald-400">
                        {item.odds.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Partido
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-300">
                        {formatDate(item.matchDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!loading && !error && recentActivity.length > 0 && (
        <section
          className="mx-auto max-w-7xl px-6 pb-16"
          aria-labelledby="recent-activity-title"
        >
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
              Actividad real
            </p>
            <h2
              id="recent-activity-title"
              className="mt-2 text-2xl font-extrabold"
            >
              Últimos pronósticos
            </h2>
            <div className="mt-6 divide-y divide-white/10">
              {recentActivity.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold">
                      {item.homeTeam} vs {item.awayTeam}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.league} · {formatDate(item.matchDate)}
                    </p>
                  </div>
                  <StatusBadge
                    label={
                      item.status === "PENDING"
                        ? "Próximo"
                        : item.status === "WON"
                          ? "Resultado ganado"
                          : item.status === "LOST"
                            ? "Resultado perdido"
                            : "Resultado anulado"
                    }
                    tone={statusTone(item.status)}
                  />
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}

      <footer className="mt-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-lasfifijas.png"
              alt="Logo Las Fifijas"
              width={42}
              height={42}
              className="h-10 w-10 rounded-full object-cover"
            />

            <p className="font-black">
              LAS
              <span className="text-emerald-400">FIFIJAS</span>
            </p>
          </div>

          <p className="text-sm text-slate-600">© 2026 LASFIFIJAS</p>
        </div>
      </footer>
    </main>
  );
}
