import type { MembershipPlan } from "@/lib/types";

const membershipPlans = new Set<MembershipPlan>([
  "ONE_MONTH",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "TWELVE_MONTHS",
]);

const allowedRedirects = new Set(["/#membresias", "/#premium"]);

export function parseMembershipPlan(value: string | null): MembershipPlan | null {
  return value && membershipPlans.has(value as MembershipPlan)
    ? (value as MembershipPlan)
    : null;
}

export function getSafeMembershipRedirect(value: string | null) {
  return value && allowedRedirects.has(value) ? value : null;
}

export function createMembershipLoginUrl(plan: MembershipPlan) {
  const query = new URLSearchParams({ redirect: "/#membresias", plan });
  return `/login?${query.toString()}`;
}
