"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type SoundKind = "typing" | "success" | "error";
type SoundContextValue = { enabled: boolean; toggle: () => void; play: (kind: SoundKind) => void };
const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const lastTypingRef = useRef(0);

  const play = useCallback((kind: SoundKind) => {
    if (!enabled) return;
    const now = performance.now();
    if (kind === "typing" && now - lastTypingRef.current < 90) return;
    if (kind === "typing") lastTypingRef.current = now;
    try {
      const AudioContextClass = window.AudioContext;
      const context = contextRef.current ?? new AudioContextClass();
      contextRef.current = context;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequencies: Record<SoundKind, number> = { typing: 420, success: 660, error: 220 };
      const duration = kind === "typing" ? 0.025 : 0.09;
      oscillator.type = "sine";
      oscillator.frequency.value = frequencies[kind];
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === "typing" ? 0.012 : 0.025, context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {
      // El audio es una mejora opcional y nunca debe interrumpir la interfaz.
    }
  }, [enabled]);

  const value = useMemo(() => ({ enabled, toggle: () => setEnabled((current) => !current), play }), [enabled, play]);
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  return (
    <SoundContext.Provider value={value}>
      {children}
      {!isAuthRoute && (
        <button
          type="button"
          onClick={value.toggle}
          aria-label={enabled ? "Silenciar sonidos" : "Activar sonidos"}
          aria-pressed={!enabled}
          title={enabled ? "Silenciar sonidos" : "Activar sonidos"}
          className="fixed bottom-4 left-4 z-[60] grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 shadow-xl backdrop-blur-md transition hover:border-emerald-400/40 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          {enabled ? "♫" : "♪̸"}
        </button>
      )}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound debe usarse dentro de SoundProvider");
  return context;
}
