import { MembershipPlan, MembershipStatus, Role } from '@prisma/client';
import { PredictionsService } from './predictions.service';

const freePrediction = { id: 'free', isPremium: false };
const premiumPrediction = { id: 'premium', isPremium: true };

describe('PredictionsService premium access', () => {
  const prisma = {
    prediction: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  const service = new PredictionsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.prediction.findMany.mockResolvedValue([
      freePrediction,
      premiumPrediction,
    ]);
  });

  it('no expone contenido Premium sin membresía', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);
    await expect(
      service.findAvailableForUser('user-1', Role.CLIENT),
    ).resolves.toEqual([freePrediction]);
  });

  it('expone Premium con membresía activa y vigente', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      plan: MembershipPlan.ONE_MONTH,
      status: MembershipStatus.ACTIVE,
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      service.findAvailableForUser('user-1', Role.CLIENT),
    ).resolves.toEqual([freePrediction, premiumPrediction]);
  });

  it('bloquea Premium y marca vencida de forma oportunista', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-1',
      plan: MembershipPlan.ONE_MONTH,
      status: MembershipStatus.ACTIVE,
      startDate: new Date(Date.now() - 120_000),
      endDate: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      service.findAvailableForUser('user-1', Role.CLIENT),
    ).resolves.toEqual([freePrediction]);
    expect(prisma.membership.updateMany).toHaveBeenCalled();
  });

  it.each([
    [
      'futura',
      MembershipStatus.ACTIVE,
      new Date(Date.now() + 60_000),
      new Date(Date.now() + 120_000),
    ],
    [
      'cancelada',
      MembershipStatus.CANCELLED,
      new Date(Date.now() - 60_000),
      new Date(Date.now() + 60_000),
    ],
  ])(
    'bloquea Premium con membresía %s',
    async (_name, status, startDate, endDate) => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-1',
        plan: MembershipPlan.ONE_MONTH,
        status,
        startDate,
        endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.findAvailableForUser('user-1', Role.CLIENT),
      ).resolves.toEqual([freePrediction]);
    },
  );

  it('oculta el texto Premium en la respuesta pública', async () => {
    prisma.prediction.findMany.mockResolvedValue([
      { ...freePrediction, prediction: 'Contenido gratis' },
      { ...premiumPrediction, prediction: 'Contenido reservado' },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      { ...freePrediction, prediction: 'Contenido gratis' },
      { ...premiumPrediction, prediction: null },
    ]);
    expect(prisma.prediction.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: [{ matchDate: 'asc' }, { id: 'asc' }],
    });
  });

  it('rechaza equipos iguales al crear después de normalizarlos', () => {
    expect(() =>
      service.create({
        sport: 'Fútbol',
        league: 'Liga 1',
        homeTeam: 'Alianza Lima',
        awayTeam: ' alianza   lima ',
        prediction: 'Local gana',
        odds: 1.8,
        matchDate: '2026-08-01T20:00:00.000Z',
        isPremium: false,
      }),
    ).toThrow('El equipo local y el equipo visitante deben ser diferentes');
    expect(prisma.prediction.create).not.toHaveBeenCalled();
  });

  it('rechaza cambiar un solo equipo si coincide con el equipo existente', async () => {
    prisma.prediction.findUniqueOrThrow.mockResolvedValue({
      homeTeam: 'Alianza Lima',
      awayTeam: 'Universitario',
    });

    await expect(
      service.update('prediction-1', { awayTeam: 'alianza lima' }),
    ).rejects.toThrow(
      'El equipo local y el equipo visitante deben ser diferentes',
    );
    expect(prisma.prediction.update).not.toHaveBeenCalled();
  });
});
