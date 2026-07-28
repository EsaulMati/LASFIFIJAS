export type Role = "ADMIN" | "CLIENT";
export type MembershipStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type MembershipPlan =
  | "ONE_MONTH"
  | "THREE_MONTHS"
  | "SIX_MONTHS"
  | "TWELVE_MONTHS";

export type Membership = {
  id: string;
  plan: MembershipPlan;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  membership: Membership | null;
};
