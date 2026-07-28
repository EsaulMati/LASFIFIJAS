export function PasswordVisibilityButton({ visible, onToggle, target = "contraseña" }: { visible: boolean; onToggle: () => void; target?: string }) {
  const label = visible ? `Ocultar ${target}` : `Mostrar ${target}`;
  return (
    <button type="button" onClick={onToggle} aria-label={label} aria-pressed={visible} title={label} className="absolute inset-y-0 right-3 my-auto grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-white/5 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-400 active:scale-95">
      {visible ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.2 0 8.8 4.6 9.7 6a1.7 1.7 0 010 2c-.5.8-1.9 2.6-4 4M6.2 6.2C4.2 7.6 2.9 9.5 2.3 10.4a1.7 1.7 0 000 2C3.2 13.8 6.8 18 12 18c.8 0 1.5-.1 2.2-.3" /></svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.3 10.4C3.2 9 6.8 4 12 4s8.8 5 9.7 6.4a1.7 1.7 0 010 2C20.8 13.8 17.2 18 12 18s-8.8-4.2-9.7-5.6a1.7 1.7 0 010-2z" /><circle cx="12" cy="11" r="3" /></svg>
      )}
    </button>
  );
}
