import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipPlan, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addCalendarMonths, monthsByPlan } from './membership.utils';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async activateMembership(
    userId: string,
    plan: MembershipPlan = MembershipPlan.ONE_MONTH,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const now = new Date();
    const startDate = now;
    const endDate = addCalendarMonths(startDate, monthsByPlan[plan]);

    return this.prisma.membership.upsert({
      where: {
        userId,
      },

      update: {
        plan,
        status: MembershipStatus.ACTIVE,
        startDate,
        endDate,
      },

      create: {
        userId,
        plan,
        status: MembershipStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
  }

  async cancelMembership(userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId,
      },
    });

    if (!membership) {
      throw new NotFoundException('El usuario no tiene una membresía');
    }

    return this.prisma.membership.update({
      where: {
        userId,
      },
      data: {
        status: MembershipStatus.CANCELLED,
      },
    });
  }
}
