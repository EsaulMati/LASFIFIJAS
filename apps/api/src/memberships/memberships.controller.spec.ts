import { Test, TestingModule } from '@nestjs/testing';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { RateLimitService } from '../security/rate-limit.service';

describe('MembershipsController', () => {
  let controller: MembershipsController;
  const activateMembership = jest.fn();
  const membershipsService: Pick<
    MembershipsService,
    'activateMembership' | 'cancelMembership'
  > = {
    activateMembership,
    cancelMembership: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipsController],
      providers: [
        RateLimitService,
        { provide: MembershipsService, useValue: membershipsService },
      ],
    }).compile();

    controller = module.get<MembershipsController>(MembershipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('activa la compra para el usuario autenticado', async () => {
    activateMembership.mockResolvedValueOnce({
      status: 'ACTIVE',
    });

    await expect(
      controller.purchase(
        {
          user: {
            userId: 'user-1',
            email: 'client@example.com',
            role: 'CLIENT',
          },
        } as never,
        { plan: 'TWELVE_MONTHS' } as never,
      ),
    ).resolves.toEqual({ status: 'ACTIVE' });
    expect(membershipsService.activateMembership).toHaveBeenCalledWith(
      'user-1',
      'TWELVE_MONTHS',
    );
  });
});
