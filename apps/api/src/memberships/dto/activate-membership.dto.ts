import { MembershipPlan } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ActivateMembershipDto {
  @IsEnum(MembershipPlan)
  plan: MembershipPlan;
}
