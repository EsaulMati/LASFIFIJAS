import { Membership, MembershipPlan, MembershipStatus } from '@prisma/client';

type MembershipAccessWindow = Pick<
  Membership,
  'status' | 'startDate' | 'endDate'
>;

export const monthsByPlan: Record<MembershipPlan, number> = {
  [MembershipPlan.ONE_MONTH]: 1,
  [MembershipPlan.THREE_MONTHS]: 3,
  [MembershipPlan.SIX_MONTHS]: 6,
  [MembershipPlan.TWELVE_MONTHS]: 12,
};

export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));

  return result;
}

export function isMembershipActive(
  membership: MembershipAccessWindow | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(
    membership?.status === MembershipStatus.ACTIVE &&
    membership.startDate <= now &&
    membership.endDate > now,
  );
}

export function getEffectiveMembershipStatus(
  membership: MembershipAccessWindow,
  now = new Date(),
): MembershipStatus {
  if (membership.status === MembershipStatus.CANCELLED) {
    return MembershipStatus.CANCELLED;
  }

  return isMembershipActive(membership, now)
    ? MembershipStatus.ACTIVE
    : MembershipStatus.EXPIRED;
}
