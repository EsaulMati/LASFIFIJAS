import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MembershipPlan } from '@prisma/client';
import { ActivateMembershipDto } from './activate-membership.dto';

describe('ActivateMembershipDto', () => {
  it('acepta los planes reales', async () => {
    for (const plan of Object.values(MembershipPlan)) {
      await expect(
        validate(plainToInstance(ActivateMembershipDto, { plan })),
      ).resolves.toEqual([]);
    }
  });

  it('rechaza planes desconocidos', async () => {
    await expect(
      validate(plainToInstance(ActivateMembershipDto, { plan: 'ONE_YEAR' })),
    ).resolves.not.toHaveLength(0);
  });
});
