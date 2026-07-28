import { Test, TestingModule } from '@nestjs/testing';
import { MembershipPlan, MembershipStatus } from '@prisma/client';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MembershipsService', () => {
  let service: MembershipsService;
  const prisma = {
    user: { findUnique: jest.fn() },
    membership: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
  });

  afterEach(() => jest.useRealTimers());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reactiva un plan anual desde ahora y calcula un aÃ±o de calendario', async () => {
    const startDate = new Date('2024-02-29T15:00:00.000Z');
    const endDate = new Date('2025-02-28T15:00:00.000Z');
    jest.useFakeTimers().setSystemTime(startDate);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.membership.upsert.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      plan: MembershipPlan.TWELVE_MONTHS,
      status: MembershipStatus.ACTIVE,
      startDate,
      endDate,
      createdAt: startDate,
      updatedAt: startDate,
    });

    await service.activateMembership('user-1', MembershipPlan.TWELVE_MONTHS);

    expect(prisma.membership.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {
        plan: MembershipPlan.TWELVE_MONTHS,
        status: MembershipStatus.ACTIVE,
        startDate,
        endDate,
      },
      create: {
        userId: 'user-1',
        plan: MembershipPlan.TWELVE_MONTHS,
        status: MembershipStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
  });

  it('marca una membresÃ­a como cancelada', async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.membership.update.mockResolvedValue({
      id: 'membership-1',
      status: MembershipStatus.CANCELLED,
    });

    await expect(service.cancelMembership('user-1')).resolves.toEqual(
      expect.objectContaining({ status: MembershipStatus.CANCELLED }),
    );
    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { status: MembershipStatus.CANCELLED },
    });
  });
});
