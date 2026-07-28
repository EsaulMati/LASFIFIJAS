import styles from "./honeycomb-loader.module.css";

export function HoneycombLoader({ size = "normal", tone = "emerald", label = "Cargando...", className = "" }: { size?: "small" | "normal"; tone?: "emerald" | "dark"; label?: string; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`${styles.root} ${styles[size]} ${tone === "dark" ? styles.dark : ""} ${className}`}>
      <span className={styles.visual} aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <span aria-hidden="true" className={styles.cell} key={index} />)}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
