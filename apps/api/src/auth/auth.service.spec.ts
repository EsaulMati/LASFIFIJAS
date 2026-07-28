import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MembershipPlan, MembershipStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn() },
    membership: { updateMany: jest.fn() },
  };
  const jwtService: Pick<JwtService, 'signAsync'> = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([Role.CLIENT, Role.ADMIN])(
    'conserva el rol %s en el login para la redirección del frontend',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue({
        id: `user-${role}`,
        name: role,
        email: `${role.toLowerCase()}@example.com`,
        role,
        passwordHash: await bcrypt.hash('Segura123!', 4),
      });
      jest.mocked(jwtService.signAsync).mockResolvedValue('jwt-test-token');

      await expect(
        service.login({
          email: `${role.toLowerCase()}@example.com`,
          password: 'Segura123!',
        }),
      ).resolves.toMatchObject({
        token: 'jwt-test-token',
        user: { role },
      });
    },
  );

  it('devuelve una membresía futura como no activa en /auth/me', async () => {
    const now = Date.now();
    prisma.user.findUnique.mockResolvedValue({
      id: 'client-1',
      name: 'Cliente',
      email: 'cliente@example.com',
      role: Role.CLIENT,
      membership: {
        id: 'membership-1',
        userId: 'client-1',
        plan: MembershipPlan.ONE_MONTH,
        status: MembershipStatus.ACTIVE,
        startDate: new Date(now + 60_000),
        endDate: new Date(now + 120_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(
      service.getCurrentUser({
        userId: 'client-1',
        email: 'cliente@example.com',
        role: Role.CLIENT,
      }),
    ).resolves.toMatchObject({
      membership: { status: MembershipStatus.EXPIRED },
    });
    expect(prisma.membership.updateMany).not.toHaveBeenCalled();
  });
});
