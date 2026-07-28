import Link from "next/link";

export function BackButton({ href = "/", label = "Volver al inicio", className = "" }: { href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-400/20 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-lg shadow-black/20 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:shadow-emerald-950/40 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-emerald-400 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-emerald-400 transition-transform duration-200 group-hover:-translate-x-1"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
      {label}
    </Link>
  );
}
