"use client";

import { Toaster } from "sonner";

export function GlobalToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      visibleToasts={4}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: "!rounded-2xl !border-white/10 !bg-slate-950/90 !text-white !shadow-2xl !shadow-black/40 !backdrop-blur-xl",
          success: "!border-emerald-400/35 !shadow-emerald-950/40",
          error: "!border-rose-400/40 !shadow-rose-950/40",
          warning: "!border-amber-400/40 !shadow-amber-950/40",
          info: "!border-sky-400/40 !shadow-sky-950/40",
          title: "!font-bold",
          description: "!text-slate-400",
          closeButton: "!border-white/10 !bg-slate-900 !text-slate-300 hover:!text-white",
          actionButton: "!rounded-full !bg-emerald-400 !font-bold !text-slate-950",
        },
      }}
    />
  );
}
