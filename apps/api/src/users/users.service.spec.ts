import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPlan, MembershipStatus, Role } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve a administración el estado efectivo de las membresías', async () => {
    const now = Date.now();
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'future-user',
        name: 'Futuro',
        email: 'futuro@example.com',
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        membership: {
          id: 'future-membership',
          plan: MembershipPlan.ONE_MONTH,
          status: MembershipStatus.ACTIVE,
          startDate: new Date(now + 60_000),
          endDate: new Date(now + 120_000),
        },
      },
      {
        id: 'expired-user',
        name: 'Vencido',
        email: 'vencido@example.com',
        role: Role.CLIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
        membership: {
          id: 'expired-membership',
          plan: MembershipPlan.ONE_MONTH,
          status: MembershipStatus.ACTIVE,
          startDate: new Date(now - 120_000),
          endDate: new Date(now - 60_000),
        },
      },
    ]);

    const users = await service.findAll();

    expect(users.map((user) => user.membership?.status)).toEqual([
      MembershipStatus.EXPIRED,
      MembershipStatus.EXPIRED,
    ]);
  });
});
