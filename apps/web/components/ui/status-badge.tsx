export type StatusTone = "success" | "danger" | "warning" | "neutral" | "info" | "premium";
const tones: Record<StatusTone, string> = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  neutral: "border-slate-400/25 bg-slate-400/10 text-slate-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  premium: "border-violet-400/30 bg-violet-400/10 text-violet-200",
};
export function StatusBadge({ label, tone = "neutral", className = "" }: { label: string; tone?: StatusTone; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{label}</span>;
}
