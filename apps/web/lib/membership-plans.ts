import type { MembershipPlan } from "@/lib/types";

export type MembershipPlanDetails = {
  plan: MembershipPlan;
  title: string;
  duration: string;
  description: string;
  priceLabel: string;
  recommended?: boolean;
};

export const membershipPlans: MembershipPlanDetails[] = [
  { plan: "ONE_MONTH", title: "1 mes", duration: "30 días de acceso", description: "Ideal para probar el contenido Premium y acceder a todos nuestros pronósticos exclusivos.", priceLabel: "Precio por confirmar" },
  { plan: "THREE_MONTHS", title: "3 meses", duration: "3 meses de acceso", description: "Accede durante una temporada más larga y sigue nuestros análisis y pronósticos Premium.", priceLabel: "Precio por confirmar" },
  { plan: "SIX_MONTHS", title: "6 meses", duration: "6 meses de acceso", description: "Una membresía pensada para quienes quieren acompañarnos durante gran parte de la temporada.", priceLabel: "Precio por confirmar" },
  { plan: "TWELVE_MONTHS", title: "12 meses", duration: "1 año de acceso", description: "La experiencia completa de Las Fifijas durante todo un año.", priceLabel: "Precio por confirmar", recommended: true },
];

export function getMembershipPlan(plan: MembershipPlan) {
  return membershipPlans.find((item) => item.plan === plan) ?? membershipPlans[0];
}
