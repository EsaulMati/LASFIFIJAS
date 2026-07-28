"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { MembershipPlanDetails } from "@/lib/membership-plans";
import { AnimatedActionButton } from "@/components/ui/animated-action-button";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import type { Membership } from "@/lib/types";
import Card from "./card";
import styles from "./payment-demo-modal.module.css";

const PAYMENT_SIMULATION_MS = 5200;
type Method = "card" | "yape" | "plin" | "pagoefectivo" | "cuotealo";
type Step = "summary" | "method" | "details" | "processing" | "success" | "failure";

const methods: Array<{ id: Method; title: string; detail: string }> = [
  { id: "card", title: "Tarjeta", detail: "Visa, Mastercard, American Express y Diners Club" },
  { id: "yape", title: "Yape", detail: "Código de aprobación simulado" },
  { id: "plin", title: "Plin o QR", detail: "Lectura de QR simulada" },
  { id: "pagoefectivo", title: "PagoEfectivo", detail: "Código CIP de demostración" },
  { id: "cuotealo", title: "Cuotéalo BCP", detail: "Financiamiento simulado" },
];

export function PaymentDemoModal({ plan, onClose }: { plan: MembershipPlanDetails | null; onClose: () => void }) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>("summary");
  const [method, setMethod] = useState<Method | null>(null);
  const [card, setCard] = useState({ holder: "", number: "", expiry: "", cvv: "" });
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const processing = step === "processing";

  useEffect(() => {
    if (!plan) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, plan, processing]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    if (!plan) queueMicrotask(() => {
      setStep("summary");
      setMethod(null);
      setError("");
      setCard({ holder: "", number: "", expiry: "", cvv: "" });
    });
  }, [plan]);

  if (!plan) return null;

  const beginProcessing = async () => {
    setError("");
    setStep("processing");
    const animation = new Promise<void>((resolve) => {
      timerRef.current = setTimeout(resolve, PAYMENT_SIMULATION_MS);
    });
    try {
      const purchase = apiFetch<Membership>("/memberships/purchase", {
        method: "POST",
        body: JSON.stringify({ plan: plan.plan }),
      });
      await Promise.all([animation, purchase]);
      const synchronized = await refreshUser();
      if (!synchronized) {
        throw new Error(
          "La membresía se guardó, pero no se pudo sincronizar la sesión",
        );
      }
      setStep("success");
    } catch (purchaseError) {
      await animation;
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "No se pudo guardar la membresía",
      );
      setStep("failure");
    }
  };
  const submitCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!card.holder.trim() || card.number.replace(/\s/g, "").length !== 16 || !/^\d{2}\/\d{2}$/.test(card.expiry) || !/^\d{3,4}$/.test(card.cvv)) {
      setError("Completa todos los datos ficticios con el formato indicado.");
      return;
    }
    void beginProcessing();
  };

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) onClose(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={processing ? undefined : "payment-title"}
        aria-label={processing ? "Procesando pago simulado" : undefined}
        tabIndex={-1}
        className={`${styles.dialog} ${processing ? styles.processingDialog : ""}`}
      >
        {!processing && (
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Pago simulado</p>
              <h2 id="payment-title" className={styles.title}>Completa tu membresía</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar pago simulado" className={styles.close}>×</button>
          </header>
        )}

        <div className={styles.content}>
          {step === "summary" && (
            <section className={styles.step} aria-labelledby="summary-title">
              <p className={styles.stepNumber}>Paso 1 de 4</p>
              <h3 id="summary-title">Resumen de tu membresía</h3>
              <div className={styles.planSummary}>
                <div><span>Plan</span><strong>{plan.title}</strong></div>
                <div><span>Duración</span><strong>{plan.duration}</strong></div>
                <div><span>Precio</span><strong>{plan.priceLabel}</strong></div>
              </div>
              <ul className={styles.benefits}>
                <li>Pronósticos Premium</li><li>Análisis completos</li><li>Contenido exclusivo</li>
              </ul>
              <p className={styles.demoNotice}><strong>Modo de prueba.</strong> No se realizará ningún cobro real. Al completar el flujo, se activará una membresía de prueba dentro de LASFIFIJAS.</p>
              <AnimatedActionButton fullWidth onClick={() => setStep("method")}>Continuar</AnimatedActionButton>
            </section>
          )}

          {step === "method" && (
            <section className={styles.step} aria-labelledby="method-title">
              <p className={styles.stepNumber}>Paso 2 de 4</p>
              <h3 id="method-title">Selecciona un método simulado</h3>
              <p className={styles.helper}>La disponibilidad comercial real dependerá de la configuración futura de Culqi.</p>
              <div className={styles.methodGrid} role="radiogroup" aria-label="Método de pago simulado">
                {methods.map((item) => (
                  <button key={item.id} type="button" role="radio" aria-checked={method === item.id} className={`${styles.method} ${method === item.id ? styles.methodActive : ""}`} onClick={() => setMethod(item.id)}>
                    <strong>{item.title}</strong><span>{item.detail}</span>
                  </button>
                ))}
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setStep("summary")}>Atrás</button>
                <AnimatedActionButton disabled={!method} onClick={() => setStep("details")}>Continuar</AnimatedActionButton>
              </div>
            </section>
          )}

          {step === "details" && method && (
            <section className={styles.step} aria-labelledby="details-title">
              <p className={styles.stepNumber}>Paso 3 de 4</p>
              <h3 id="details-title">Completar simulación</h3>
              {method === "card" ? (
                <form onSubmit={submitCard} className={styles.form} autoComplete="off">
                  <p className={styles.helper}>Datos ficticios: 4242 4242 4242 4242 · 12/30 · 123</p>
                  <label>Nombre del titular<input value={card.holder} onChange={(event) => setCard((value) => ({ ...value, holder: event.target.value }))} placeholder="Usuario Demo" /></label>
                  <label>Número de tarjeta ficticia<input inputMode="numeric" value={card.number} onChange={(event) => setCard((value) => ({ ...value, number: event.target.value }))} placeholder="4242 4242 4242 4242" /></label>
                  <div className={styles.formRow}>
                    <label>Vencimiento<input inputMode="numeric" value={card.expiry} onChange={(event) => setCard((value) => ({ ...value, expiry: event.target.value }))} placeholder="12/30" /></label>
                    <label>CVV<input inputMode="numeric" value={card.cvv} onChange={(event) => setCard((value) => ({ ...value, cvv: event.target.value }))} placeholder="123" /></label>
                  </div>
                  {error && <p role="alert" className={styles.error}>{error}</p>}
                  <AnimatedActionButton type="submit" fullWidth>Pagar membresía</AnimatedActionButton>
                </form>
              ) : (
                <div className={styles.alternative}>
                  {(method === "yape" || method === "plin") && <><div className={styles.qr} aria-label="Código QR ficticio" /><h4>{method === "yape" ? "Yape" : "Plin o QR"}</h4><p>Escanea el QR ficticio y confirma la operación de demostración.</p></>}
                  {method === "pagoefectivo" && <><div className={styles.code}>CIP 000 123 456</div><h4>PagoEfectivo</h4><p>Este código CIP es ficticio y no puede utilizarse para pagar.</p></>}
                  {method === "cuotealo" && <><div className={styles.finance}>BCP</div><h4>Cuotéalo BCP</h4><p>La evaluación y el financiamiento se representan únicamente como simulación.</p></>}
                  <AnimatedActionButton fullWidth onClick={() => void beginProcessing()}>Pagar membresía</AnimatedActionButton>
                </div>
              )}
              <button type="button" className={styles.backLink} onClick={() => setStep("method")}>← Cambiar método</button>
            </section>
          )}

          {step === "processing" && (
            <section className={styles.processing} aria-live="polite">
              <div className={styles.processingTrack} aria-hidden="true">
                <div className={styles.processingRunner}>
                  <Card />
                </div>
              </div>
              <h3>Procesando pago simulado…</h3>
            </section>
          )}

          {step === "failure" && (
            <section className={styles.success} role="alert">
              <h3>No se pudo activar la membresía</h3>
              <p>{error}</p>
              <AnimatedActionButton onClick={() => setStep("details")}>Volver a intentar</AnimatedActionButton>
            </section>
          )}

          {step === "success" && (
            <section className={styles.success} aria-live="polite">
              <div aria-hidden="true">✓</div><h3>Membresía de prueba activada</h3>
              <p>No se realizó ningún cobro real. Tu membresía de prueba fue activada correctamente dentro de LASFIFIJAS.</p>
              <AnimatedActionButton onClick={onClose}>Cerrar</AnimatedActionButton>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
