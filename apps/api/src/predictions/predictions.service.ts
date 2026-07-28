import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { isMembershipActive } from '../memberships/membership.utils';

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertDifferentTeams(homeTeam: string, awayTeam: string) {
    const normalizeTeam = (team: string) =>
      team.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

    if (normalizeTeam(homeTeam) === normalizeTeam(awayTeam)) {
      throw new BadRequestException(
        'El equipo local y el equipo visitante deben ser diferentes',
      );
    }
  }

  private async hasActiveMembership(userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId,
      },
    });

    const now = new Date();

    if (isMembershipActive(membership, now)) {
      return true;
    }

    if (
      membership?.status === MembershipStatus.ACTIVE &&
      membership.endDate <= now
    ) {
      await this.prisma.membership.updateMany({
        where: {
          id: membership.id,
          status: MembershipStatus.ACTIVE,
          endDate: {
            lte: now,
          },
        },
        data: {
          status: MembershipStatus.EXPIRED,
        },
      });
    }

    return false;
  }

  async findAll() {
    const predictions = await this.prisma.prediction.findMany({
      where: { status: 'PENDING' },
      orderBy: [{ matchDate: 'asc' }, { id: 'asc' }],
    });

    return predictions.map((prediction) => ({
      ...prediction,
      prediction: prediction.isPremium ? null : prediction.prediction,
    }));
  }

  async findAvailableForUser(userId: string, role?: Role) {
    const predictions = await this.prisma.prediction.findMany({
      orderBy: [{ matchDate: 'asc' }, { id: 'asc' }],
    });

    if (role === 'ADMIN') {
      return predictions;
    }

    const hasActiveMembership = await this.hasActiveMembership(userId);

    return predictions.filter(
      (prediction) => !prediction.isPremium || hasActiveMembership,
    );
  }

  create(createPredictionDto: CreatePredictionDto) {
    this.assertDifferentTeams(
      createPredictionDto.homeTeam,
      createPredictionDto.awayTeam,
    );

    return this.prisma.prediction.create({
      data: {
        sport: createPredictionDto.sport,
        league: createPredictionDto.league,
        homeTeam: createPredictionDto.homeTeam,
        awayTeam: createPredictionDto.awayTeam,
        prediction: createPredictionDto.prediction,
        odds: createPredictionDto.odds,
        matchDate: new Date(createPredictionDto.matchDate),
        isPremium: createPredictionDto.isPremium,
      },
    });
  }

  async update(id: string, updatePredictionDto: UpdatePredictionDto) {
    if (
      updatePredictionDto.homeTeam !== undefined ||
      updatePredictionDto.awayTeam !== undefined
    ) {
      const currentPrediction = await this.prisma.prediction.findUniqueOrThrow({
        where: { id },
        select: { homeTeam: true, awayTeam: true },
      });
      this.assertDifferentTeams(
        updatePredictionDto.homeTeam ?? currentPrediction.homeTeam,
        updatePredictionDto.awayTeam ?? currentPrediction.awayTeam,
      );
    }

    return this.prisma.prediction.update({
      where: {
        id,
      },
      data: {
        ...updatePredictionDto,
        matchDate: updatePredictionDto.matchDate
          ? new Date(updatePredictionDto.matchDate)
          : undefined,
      },
    });
  }
  remove(id: string) {
    return this.prisma.prediction.delete({
      where: {
        id,
      },
    });
  }
}
