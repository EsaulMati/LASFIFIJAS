import { MembershipPlan, MembershipStatus } from '@prisma/client';
import {
  addCalendarMonths,
  getEffectiveMembershipStatus,
  isMembershipActive,
  monthsByPlan,
} from './membership.utils';

const baseMembership = {
  id: 'membership-1',
  userId: 'user-1',
  plan: MembershipPlan.ONE_MONTH,
  status: MembershipStatus.ACTIVE,
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-08-01T00:00:00.000Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('membership rules', () => {
  it('acepta una membresía activa dentro del intervalo', () => {
    expect(
      isMembershipActive(baseMembership, new Date('2026-07-15T00:00:00Z')),
    ).toBe(true);
  });

  it('rechaza una membresía vencida aunque conserve ACTIVE', () => {
    expect(
      isMembershipActive(baseMembership, new Date('2026-08-01T00:00:00Z')),
    ).toBe(false);
  });

  it('rechaza una membresía cancelada', () => {
    expect(
      isMembershipActive(
        { ...baseMembership, status: MembershipStatus.CANCELLED },
        new Date('2026-07-15T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('presenta una membresía futura como no activa', () => {
    const futureMembership = {
      ...baseMembership,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-10-01T00:00:00.000Z'),
    };

    expect(
      getEffectiveMembershipStatus(
        futureMembership,
        new Date('2026-08-01T00:00:00.000Z'),
      ),
    ).toBe(MembershipStatus.EXPIRED);
    expect(
      isMembershipActive(
        futureMembership,
        new Date('2026-08-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('conserva CANCELLED aunque sus fechas estén vigentes', () => {
    expect(
      getEffectiveMembershipStatus(
        { ...baseMembership, status: MembershipStatus.CANCELLED },
        new Date('2026-07-15T00:00:00.000Z'),
      ),
    ).toBe(MembershipStatus.CANCELLED);
  });

  it('suma meses calendario y ajusta finales de mes', () => {
    expect(
      addCalendarMonths(
        new Date('2026-01-31T12:00:00Z'),
        monthsByPlan[MembershipPlan.ONE_MONTH],
      ).toISOString(),
    ).toBe('2026-02-28T12:00:00.000Z');
    expect(
      addCalendarMonths(
        new Date('2026-01-31T12:00:00Z'),
        monthsByPlan[MembershipPlan.TWELVE_MONTHS],
      ).toISOString(),
    ).toBe('2027-01-31T12:00:00.000Z');
  });
});
