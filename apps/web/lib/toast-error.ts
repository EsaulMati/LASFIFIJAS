import { toast } from "sonner";
import { ApiError } from "./api";

export function toastRequestError(error: unknown, id: string, fallback: string, retry?: () => void) {
  if (error instanceof ApiError && error.kind === "session") return;
  const message =
    error instanceof ApiError && error.kind === "network"
      ? "No se pudo conectar con el servidor"
      : error instanceof ApiError && error.kind === "server"
        ? "El servidor tuvo un problema. Inténtalo nuevamente"
        : error instanceof Error
          ? error.message
          : fallback;
  toast.error(message, {
    id,
    action: retry ? { label: "Reintentar", onClick: retry } : undefined,
  });
}
