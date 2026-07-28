"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { AuthUser, Role } from "@/lib/types";
import { useSound } from "@/components/sound-provider";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const protectedRoutes: Record<string, Role> = {
  "/dashboard": "CLIENT",
  "/admin": "ADMIN",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { play } = useSound();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await apiFetch<AuthUser>("/auth/me");
      userRef.current = currentUser;
      setUser(currentUser);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (userRef.current) {
          toast.warning("Tu sesión ha vencido. Inicia sesión nuevamente", { id: "session-expired" });
        }
        userRef.current = null;
        setUser(null);
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo comprobar tu sesión",
          { id: "session-check-error" },
        );
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      if (!userRef.current) return;
      userRef.current = null;
      setUser(null);
      toast.warning("Tu sesión ha vencido. Inicia sesión nuevamente", { id: "session-expired" });
      router.replace("/login");
    }
    window.addEventListener("auth:session-expired", handleExpiredSession);
    return () => window.removeEventListener("auth:session-expired", handleExpiredSession);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      refreshUser().catch(() => undefined);
    });
  }, [refreshUser]);

  useEffect(() => {
    if (loading) return;
    const requiredRole = protectedRoutes[pathname];
    if (!requiredRole) return;
    if (!user) router.replace("/login");
    else if (user.role !== requiredRole) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [loading, pathname, router, user]);

  const login = useCallback(async (email: string, password: string) => {
    await apiFetch<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const currentUser = await apiFetch<AuthUser>("/auth/me");
    userRef.current = currentUser;
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
      toast.success("Sesión cerrada correctamente", { id: "logout-success" });
      play("success");
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== "session") {
        toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión", { id: "logout-error" });
        play("error");
      }
    } finally {
      userRef.current = null;
      setUser(null);
      router.replace("/");
      router.refresh();
    }
  }, [play, router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [loading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030817] text-slate-400">
        <p>Cargando tu sesión...</p>
      </main>
    );
  }
  return children;
}
