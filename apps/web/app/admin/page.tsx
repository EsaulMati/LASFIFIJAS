"use client";

import {
  ComponentPropsWithoutRef,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProtectedPage, useAuth } from "@/components/auth-provider";
import { apiFetch, isCancelledRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastRequestError } from "@/lib/toast-error";
import { BackButton } from "@/components/back-button";
import { useSound } from "@/components/sound-provider";
import { AnimatedActionButton } from "@/components/ui/animated-action-button";
import { HoneycombLoader } from "@/components/ui/honeycomb-loader";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";

type PredictionStatus = "PENDING" | "WON" | "LOST" | "VOID";

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

type MembershipPlan =
  "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS";

type Membership = {
  id: string;
  plan: MembershipPlan;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
  membership?: Membership | null;
};

type AdminSection = "predictions" | "users";

const planLabels: Record<MembershipPlan, string> = {
  ONE_MONTH: "1 mes",
  THREE_MONTHS: "3 meses",
  SIX_MONTHS: "6 meses",
  TWELVE_MONTHS: "12 meses",
};

const predictionStatusLabels: Record<PredictionStatus, string> = {
  PENDING: "Pendiente",
  WON: "Ganado",
  LOST: "Perdido",
  VOID: "Anulado",
};

function isPredictionStatus(value: string): value is PredictionStatus {
  return (
    value === "PENDING" ||
    value === "WON" ||
    value === "LOST" ||
    value === "VOID"
  );
}

function AdminInput({
  label,
  ...inputProps
}: { label: string } & Omit<ComponentPropsWithoutRef<"input">, "className">) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-300">
      <span>{label}</span>
      <input
        {...inputProps}
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-55"
      />
    </label>
  );
}

export default function AdminPage() {
  return (
    <ProtectedPage>
      <AdminContent />
    </ProtectedPage>
  );
}

function AdminContent() {
  const { user: currentUser, logout } = useAuth();
  const { play } = useSound();

  const [section, setSection] = useState<AdminSection>("predictions");

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [loadingPredictions, setLoadingPredictions] = useState(true);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [predictionLoadError, setPredictionLoadError] = useState("");
  const [userLoadError, setUserLoadError] = useState("");

  const [error, setError] = useState("");
  const [savingPrediction, setSavingPrediction] = useState(false);
  const [deletingPredictionId, setDeletingPredictionId] = useState<
    string | null
  >(null);
  const [editingPredictionId, setEditingPredictionId] = useState<string | null>(
    null,
  );

  const [selectedPlans, setSelectedPlans] = useState<
    Record<string, MembershipPlan>
  >({});

  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [cancellingUserId, setCancellingUserId] = useState<string | null>(null);

  const [sport, setSport] = useState("");
  const [league, setLeague] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [prediction, setPrediction] = useState("");
  const [odds, setOdds] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [predictionStatus, setPredictionStatus] =
    useState<PredictionStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PredictionStatus>(
    "ALL",
  );
  const [sportFilter, setSportFilter] = useState("ALL");
  const [now, setNow] = useState<Date | null>(null);
  const predictionRequestRef = useRef(0);
  const userRequestRef = useRef(0);

  async function loadPredictions(signal?: AbortSignal) {
    const requestId = ++predictionRequestRef.current;
    try {
      setLoadingPredictions(true);
      setPredictionLoadError("");
      const data = await apiFetch<Prediction[]>("/predictions/my", { signal });
      if (requestId === predictionRequestRef.current) setPredictions(data);
    } catch (error) {
      if (isCancelledRequest(error)) return;
      if (requestId !== predictionRequestRef.current) return;
      setPredictionLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los pronósticos",
      );
      toastRequestError(
        error,
        "predictions-load-error",
        "No se pudieron cargar los pronósticos",
      );
    } finally {
      if (!signal?.aborted && requestId === predictionRequestRef.current) {
        setLoadingPredictions(false);
      }
    }
  }

  async function loadUsers(signal?: AbortSignal) {
    const requestId = ++userRequestRef.current;
    try {
      setLoadingUsers(true);
      setUserLoadError("");
      const data = await apiFetch<User[]>("/users", { signal });
      if (requestId !== userRequestRef.current) return;

      setUsers(data);

      const initialPlans: Record<string, MembershipPlan> = {};

      data.forEach((user: User) => {
        initialPlans[user.id] = user.membership?.plan ?? "ONE_MONTH";
      });

      setSelectedPlans(initialPlans);
    } catch (error) {
      if (isCancelledRequest(error)) return;
      if (requestId !== userRequestRef.current) return;
      setUserLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los usuarios",
      );
      toastRequestError(
        error,
        "users-load-error",
        "No se pudieron cargar los usuarios",
      );
    } finally {
      if (!signal?.aborted && requestId === userRequestRef.current) {
        setLoadingUsers(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const refreshAdministration = () => {
      void loadPredictions();
      void loadUsers();
    };
    queueMicrotask(() => {
      void loadPredictions(controller.signal);
      void loadUsers(controller.signal);
    });
    window.addEventListener("focus", refreshAdministration);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshAdministration);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setNow(new Date()));
  }, []);

  function resetPredictionForm() {
    setSport("");
    setLeague("");
    setHomeTeam("");
    setAwayTeam("");
    setPrediction("");
    setOdds("");
    setMatchDate("");
    setIsPremium(false);
    setPredictionStatus("PENDING");
    setEditingPredictionId(null);
    setShowForm(false);
    setError("");
  }

  function startEditingPrediction(item: Prediction) {
    const date = new Date(item.matchDate);
    const localMatchDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);

    setSport(item.sport);
    setLeague(item.league);
    setHomeTeam(item.homeTeam);
    setAwayTeam(item.awayTeam);
    setPrediction(item.prediction);
    setOdds(String(item.odds));
    setMatchDate(localMatchDate);
    setIsPremium(item.isPremium);
    setPredictionStatus(item.status);
    setEditingPredictionId(item.id);
    setError("");
    setShowForm(true);
  }

  async function savePrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    try {
      setSavingPrediction(true);
      const wasEditing = Boolean(editingPredictionId);
      await apiFetch(
        editingPredictionId
          ? `/predictions/${editingPredictionId}`
          : "/predictions",
        {
          method: editingPredictionId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sport,
            league,
            homeTeam,
            awayTeam,
            prediction,
            odds: Number(odds),
            matchDate: new Date(matchDate).toISOString(),
            isPremium,
            ...(editingPredictionId ? { status: predictionStatus } : {}),
          }),
        },
      );

      toast.success(
        wasEditing
          ? "Pronóstico actualizado correctamente"
          : "Pronóstico creado correctamente",
        { id: "prediction-saved" },
      );
      play("success");
      resetPredictionForm();

      await loadPredictions();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al guardar el pronóstico",
      );
      toastRequestError(
        error,
        "prediction-save-error",
        "Error al guardar el pronóstico",
      );
      play("error");
    } finally {
      setSavingPrediction(false);
    }
  }

  async function deletePrediction(id: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este pronóstico?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPredictionId(id);
      await apiFetch(`/predictions/${id}`, {
        method: "DELETE",
      });
      toast.success("Pronóstico eliminado correctamente", {
        id: `prediction-deleted-${id}`,
      });
      play("success");
      await loadPredictions();
    } catch (error) {
      toastRequestError(
        error,
        `prediction-delete-error-${id}`,
        "Error al eliminar el pronóstico",
      );
      play("error");
    } finally {
      setDeletingPredictionId(null);
    }
  }

  async function activateMembership(userId: string) {
    const plan = selectedPlans[userId] ?? "ONE_MONTH";

    try {
      setActivatingUserId(userId);

      await apiFetch(`/memberships/activate/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
        }),
      });

      toast.success(`Membresía de ${planLabels[plan]} activada correctamente`, {
        id: `membership-activated-${userId}`,
      });
      play("success");

      await loadUsers();
    } catch (error) {
      toastRequestError(
        error,
        `membership-activate-error-${userId}`,
        "Error al activar la membresía",
      );
      play("error");
    } finally {
      setActivatingUserId(null);
    }
  }

  async function cancelMembership(userId: string) {
    const confirmed = window.confirm(
      "¿Seguro que quieres cancelar esta membresía?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingUserId(userId);

      await apiFetch(`/memberships/cancel/${userId}`, {
        method: "PATCH",
      });

      toast.success("Membresía cancelada correctamente", {
        id: `membership-cancelled-${userId}`,
      });
      play("success");
      await loadUsers();
    } catch (error) {
      toastRequestError(
        error,
        `membership-cancel-error-${userId}`,
        "Error al cancelar la membresía",
      );
      play("error");
    } finally {
      setCancellingUserId(null);
    }
  }

  function formatDate(date?: string) {
    if (!date) {
      return "-";
    }

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  }

  const filteredPredictions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return predictions.filter(
      (item) =>
        (statusFilter === "ALL" || item.status === statusFilter) &&
        (sportFilter === "ALL" || item.sport === sportFilter) &&
        (!term ||
          [item.homeTeam, item.awayTeam, item.league, item.sport].some(
            (value) => value.toLocaleLowerCase("es").includes(term),
          )),
    );
  }, [predictions, search, sportFilter, statusFilter]);
  const sports = useMemo(
    () =>
      [...new Set(predictions.map((item) => item.sport))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [predictions],
  );
  const statusCount = (status: PredictionStatus) =>
    predictions.filter((item) => item.status === status).length;
  const greeting = now
    ? now.getHours() < 12
      ? "Buenos días"
      : now.getHours() < 19
        ? "Buenas tardes"
        : "Buenas noches"
    : "Panel administrativo";
  const currentDate = now
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAVBAR */}

      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold">
            LAS
            <span className="text-emerald-400">FIFIJAS</span>
            <span className="ml-3 text-xs font-medium tracking-widest text-slate-500">
              ADMIN
            </span>
          </h1>

          <div className="flex items-center gap-3">
            <BackButton label="Volver" className="hidden sm:inline-flex" />
            <button
              onClick={logout}
              className="min-h-11 rounded-full border border-white/10 px-4 text-sm text-slate-400 transition hover:border-rose-400/30 hover:text-rose-300 active:scale-95"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HEADER */}

        <div>
          <p className="font-semibold capitalize text-emerald-400">
            {currentDate || "Panel administrativo"}
          </p>

          <h2 className="mt-2 text-4xl font-black">
            {greeting}
            {currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}
          </h2>

          <p className="mt-3 text-slate-400">
            Administra pronósticos, usuarios y membresías.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Total"
            value={predictions.length}
            hint="Pronósticos cargados"
          />
          <MetricCard label="Pendientes" value={statusCount("PENDING")} />
          <MetricCard label="Ganados" value={statusCount("WON")} />
          <MetricCard label="Perdidos" value={statusCount("LOST")} />
          <MetricCard label="Anulados" value={statusCount("VOID")} />
        </div>

        {/* TABS */}

        <div className="mt-10 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setSection("predictions")}
            className={`border-b-2 px-5 py-4 font-semibold transition ${
              section === "predictions"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-white"
            }`}
          >
            Pronósticos
          </button>

          <button
            onClick={() => setSection("users")}
            className={`border-b-2 px-5 py-4 font-semibold transition ${
              section === "users"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-white"
            }`}
          >
            Usuarios y membresías
          </button>
        </div>

        {/* PRONÓSTICOS */}

        {section === "predictions" && (
          <section className="py-10">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h3 className="text-3xl font-bold">Pronósticos</h3>

                <p className="mt-2 text-slate-400">
                  Crea y administra los pronósticos publicados.
                </p>
              </div>

              <AnimatedActionButton
                className={showForm ? "!border-white/15 !bg-transparent !text-slate-300" : undefined}
                onClick={() => {
                  if (showForm) {
                    resetPredictionForm();
                    return;
                  }

                  setShowForm(true);
                }}
              >
                {showForm ? "Cancelar" : "+ Nuevo pronóstico"}
              </AnimatedActionButton>
            </div>

            {showForm && (
              <form
                onSubmit={savePrediction}
                className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <h3 className="text-xl font-bold">
                  {editingPredictionId
                    ? "Editar pronóstico"
                    : "Crear nuevo pronóstico"}
                </h3>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <AdminInput
                    label="Deporte"
                    disabled={savingPrediction}
                    required
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    placeholder="Deporte"
                  />

                  <AdminInput
                    label="Liga"
                    disabled={savingPrediction}
                    required
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                    placeholder="Liga"
                  />

                  <AdminInput
                    label="Equipo local"
                    disabled={savingPrediction}
                    required
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    placeholder="Equipo local"
                  />

                  <AdminInput
                    label="Equipo visitante"
                    disabled={savingPrediction}
                    required
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    placeholder="Equipo visitante"
                  />

                  <AdminInput
                    label="Pronóstico"
                    disabled={savingPrediction}
                    required
                    value={prediction}
                    onChange={(e) => setPrediction(e.target.value)}
                    placeholder="Pronóstico"
                  />

                  <AdminInput
                    label="Cuota"
                    disabled={savingPrediction}
                    required
                    type="number"
                    step="0.01"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                    placeholder="Cuota"
                  />

                  <AdminInput
                    label="Fecha y hora del partido"
                    disabled={savingPrediction}
                    required
                    type="datetime-local"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                  />

                  <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3">
                    <input
                      type="checkbox"
                      disabled={savingPrediction}
                      checked={isPremium}
                      onChange={(e) => setIsPremium(e.target.checked)}
                    />
                    Pronóstico Premium
                  </label>

                  {editingPredictionId && (
                    <label className="grid gap-2 text-sm font-semibold text-slate-300">
                      <span>Estado del pronóstico</span>
                      <select
                        value={predictionStatus}
                        onChange={(event) => {
                          if (isPredictionStatus(event.target.value))
                            setPredictionStatus(event.target.value);
                        }}
                        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                      >
                        <option value="PENDING">Pendiente</option>
                        <option value="WON">Ganado</option>
                        <option value="LOST">Perdido</option>
                        <option value="VOID">Anulado</option>
                      </select>
                    </label>
                  )}
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-red-400">
                    {error}
                  </p>
                )}

                <AnimatedActionButton
                  type="submit"
                  loading={savingPrediction}
                  className="mt-6"
                >
                  {editingPredictionId
                    ? "Guardar cambios"
                    : "Publicar pronóstico"}
                </AnimatedActionButton>
              </form>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">
                  Buscar por equipo, liga o deporte
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar equipo, liga o deporte…"
                  className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
                />
              </label>
              <label>
                <span className="sr-only">Filtrar por estado</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "ALL" || isPredictionStatus(value))
                      setStatusFilter(value);
                  }}
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 outline-none focus:border-emerald-400"
                >
                  <option value="ALL">Todos los estados</option>
                  {Object.entries(predictionStatusLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {sports.length > 0 && (
                <label>
                  <span className="sr-only">Filtrar por deporte</span>
                  <select
                    value={sportFilter}
                    onChange={(event) => setSportFilter(event.target.value)}
                    className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 outline-none focus:border-emerald-400"
                  >
                    <option value="ALL">Todos los deportes</option>
                    {sports.map((sportOption) => (
                      <option key={sportOption} value={sportOption}>
                        {sportOption}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {loadingPredictions ? (
              <div className="mt-10 rounded-2xl border border-slate-800 py-16 text-center">
                <HoneycombLoader
                  className="mx-auto"
                  label="Cargando pronósticos..."
                />
                <p className="mt-6 text-slate-400">Cargando pronósticos…</p>
              </div>
            ) : predictionLoadError ? (
              <div className="mt-10 rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-8 text-center">
                <p className="font-bold text-rose-200">{predictionLoadError}</p>
                <button
                  type="button"
                  onClick={() => void loadPredictions()}
                  className="mt-5 min-h-11 rounded-full border border-rose-300/30 px-5 font-bold text-rose-200"
                >
                  Reintentar
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
                No hay pronósticos publicados.
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
                No hay pronósticos que coincidan con los filtros.
              </div>
            ) : (
              <div className="mt-10 overflow-hidden rounded-xl border border-slate-800">
                {filteredPredictions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-5 border-b border-slate-800 bg-slate-900 p-5 last:border-0 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-bold">
                        {item.homeTeam} vs {item.awayTeam}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.sport} · {item.league} · Cuota {item.odds}
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        {item.prediction}
                      </p>

                      <div className="mt-3">
                        <StatusBadge
                          label={predictionStatusLabels[item.status]}
                          tone={
                            item.status === "WON"
                              ? "success"
                              : item.status === "LOST"
                                ? "danger"
                                : item.status === "PENDING"
                                  ? "warning"
                                  : "neutral"
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {item.isPremium && (
                        <span className="text-sm font-semibold text-amber-400">
                          PREMIUM
                        </span>
                      )}

                      <button
                        onClick={() => startEditingPrediction(item)}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => deletePrediction(item.id)}
                        disabled={deletingPredictionId === item.id}
                        className="text-red-400 hover:text-red-300"
                      >
                        {deletingPredictionId === item.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* USUARIOS */}

        {section === "users" && (
          <section className="py-10">
            <div>
              <h3 className="text-3xl font-bold">Usuarios y membresías</h3>

              <p className="mt-2 text-slate-400">
                Activa o renueva las membresías Premium de tus usuarios.
              </p>
            </div>

            {loadingUsers ? (
              <div className="mt-10 rounded-2xl border border-slate-800 py-16 text-center">
                <HoneycombLoader
                  className="mx-auto"
                  label="Cargando usuarios..."
                />
                <p className="mt-6 text-slate-400">Cargando usuarios…</p>
              </div>
            ) : userLoadError ? (
              <div className="mt-10 rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-8 text-center">
                <p className="font-bold text-rose-200">{userLoadError}</p>
                <button
                  type="button"
                  onClick={() => void loadUsers()}
                  className="mt-5 min-h-11 rounded-full border border-rose-300/30 px-5 font-bold text-rose-200"
                >
                  Reintentar
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
                No hay usuarios registrados.
              </div>
            ) : (
              <div className="mt-10 space-y-4">
                {users.map((user) => (
                  <article
                    key={user.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-bold">{user.name}</h4>

                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                            {user.role}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </p>
                      </div>

                      <div className="min-w-[220px]">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Membresía actual
                        </p>

                        {user.membership ? (
                          <>
                            <p className="mt-2 font-bold text-emerald-400">
                              {planLabels[user.membership.plan]}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              Vence: {formatDate(user.membership.endDate)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Estado: {user.membership.status}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            Sin membresía
                          </p>
                        )}
                      </div>

                      {user.role !== "ADMIN" && (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <select
                            value={selectedPlans[user.id] ?? "ONE_MONTH"}
                            onChange={(e) =>
                              setSelectedPlans((previous) => ({
                                ...previous,
                                [user.id]: e.target.value as MembershipPlan,
                              }))
                            }
                            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                          >
                            <option value="ONE_MONTH">1 mes</option>

                            <option value="THREE_MONTHS">3 meses</option>

                            <option value="SIX_MONTHS">6 meses</option>

                            <option value="TWELVE_MONTHS">12 meses</option>
                          </select>

                          <button
                            onClick={() => activateMembership(user.id)}
                            disabled={
                              activatingUserId === user.id ||
                              cancellingUserId === user.id
                            }
                            className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activatingUserId === user.id
                              ? "Activando..."
                              : user.membership
                                ? "Renovar"
                                : "Activar"}
                          </button>

                          {user.membership?.status === "ACTIVE" && (
                            <button
                              onClick={() => cancelMembership(user.id)}
                              disabled={
                                cancellingUserId === user.id ||
                                activatingUserId === user.id
                              }
                              className="rounded-xl border border-red-400/40 px-5 py-3 font-bold text-red-400 transition hover:border-red-400 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingUserId === user.id
                                ? "Cancelando..."
                                : "Cancelar membresía"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
