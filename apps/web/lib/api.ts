export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: ApiErrorKind,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

export type ApiErrorKind =
  | "validation"
  | "credentials"
  | "session"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "timeout"
  | "cancelled"
  | "network"
  | "server"
  | "unknown";

type ErrorPayload = { message?: string | string[]; error?: string };

function classifyError(status: number, path: string): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401 && path === "/auth/login") return "credentials";
  if (status === 401) return "session";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limit";
  if (status >= 500) return "server";
  return "unknown";
}

export const API_TIMEOUT_MS = 15_000;

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function isUnsafeMethod(method?: string) {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = apiFetch<{ csrfToken: string }>("/auth/csrf")
      .then((result) => {
        csrfToken = result.csrfToken;
        return result.csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

function createRequestSignal(externalSignal?: AbortSignal | null) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT_MS);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const requestSignal = createRequestSignal(init.signal);
  try {
    const csrfHeader =
      isUnsafeMethod(init.method) && path !== "/auth/login" && path !== "/users"
        ? { "X-CSRF-Token": await getCsrfToken() }
        : {};
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (csrfHeader["X-CSRF-Token"]) {
      headers.set("X-CSRF-Token", csrfHeader["X-CSRF-Token"]);
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      signal: requestSignal.signal,
      headers,
    });

    const data = (await response.json().catch(() => null)) as ErrorPayload | null;

    if (!response.ok) {
      const details = Array.isArray(data?.message) ? data.message : [];
      const message =
        details.length > 0
          ? details.join(". ")
          : typeof data?.message === "string"
            ? data.message
            : undefined;
      const kind = classifyError(response.status, path);
      if (kind === "session" && path !== "/auth/me" && typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:session-expired"));
      }
      throw new ApiError(message ?? "Ocurrió un error inesperado", response.status, kind, details);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (requestSignal.signal.aborted) {
      if (requestSignal.timedOut()) {
        throw new ApiError(
          "La solicitud tardó demasiado. Inténtalo nuevamente",
          0,
          "timeout",
        );
      }
      throw new ApiError("Solicitud cancelada", 0, "cancelled");
    }
    throw new ApiError("No se pudo conectar con el servidor", 0, "network");
  } finally {
    requestSignal.cleanup();
  }
}

export function isCancelledRequest(error: unknown) {
  return error instanceof ApiError && error.kind === "cancelled";
}
