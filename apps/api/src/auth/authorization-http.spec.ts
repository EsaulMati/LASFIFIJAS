import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { MembershipPlan, Role } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionsController } from '../predictions/predictions.controller';
import { PredictionsService } from '../predictions/predictions.service';
import { MembershipsController } from '../memberships/memberships.controller';
import { MembershipsService } from '../memberships/memberships.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { RateLimitService } from '../security/rate-limit.service';

const TEST_SECRET = 'authorization-test-secret';
const PREDICTION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const CSRF_TOKEN = 'authorization-csrf-token';
const predictionPayload = {
  sport: 'Fútbol',
  league: 'Liga 1',
  homeTeam: 'Alianza Lima',
  awayTeam: 'Universitario',
  prediction: 'Más de 1.5 goles',
  odds: 1.85,
  matchDate: '2026-08-01T20:00:00.000Z',
  isPremium: false,
};

describe('administrative authorization over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwtService: JwtService;
  let clientCookie: string;
  let adminCookie: string;

  const findUnique = jest.fn();
  const predictionsService: Pick<
    PredictionsService,
    'create' | 'update' | 'remove'
  > = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const membershipsService: Pick<
    MembershipsService,
    'activateMembership' | 'cancelMembership'
  > = {
    activateMembership: jest.fn(),
    cancelMembership: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: TEST_SECRET })],
      controllers: [PredictionsController, MembershipsController],
      providers: [
        JwtStrategy,
        RolesGuard,
        CsrfGuard,
        RateLimitGuard,
        RateLimitService,
        { provide: PredictionsService, useValue: predictionsService },
        { provide: MembershipsService, useValue: membershipsService },
        { provide: PrismaService, useValue: { user: { findUnique } } },
        {
          provide: ConfigService,
          useValue: { get: () => TEST_SECRET },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    jwtService = module.get(JwtService);
    clientCookie = `auth_token=${await jwtService.signAsync({ sub: 'client' })}`;
    adminCookie = `auth_token=${await jwtService.signAsync({ sub: 'admin' })}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        email: `${where.id}@example.com`,
        role: where.id === 'admin' ? Role.ADMIN : Role.CLIENT,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 401 a un visitante sin sesión', async () => {
    await request(baseUrl)
      .post('/predictions')
      .send(predictionPayload)
      .expect(401);
  });

  it('devuelve 403 a CLIENT al crear, editar o eliminar pronósticos', async () => {
    await request(baseUrl)
      .post('/predictions')
      .set('Cookie', clientCookie)
      .send(predictionPayload)
      .expect(403);
    await request(baseUrl)
      .patch(`/predictions/${PREDICTION_ID}`)
      .set('Cookie', clientCookie)
      .send({ status: 'WON' })
      .expect(403);
    await request(baseUrl)
      .delete(`/predictions/${PREDICTION_ID}`)
      .set('Cookie', clientCookie)
      .expect(403);
  });

  it('devuelve 403 a CLIENT al administrar membresías', async () => {
    await request(baseUrl)
      .post(`/memberships/activate/${USER_ID}`)
      .set('Cookie', clientCookie)
      .send({ plan: MembershipPlan.ONE_MONTH })
      .expect(403);
    await request(baseUrl)
      .patch(`/memberships/cancel/${USER_ID}`)
      .set('Cookie', clientCookie)
      .expect(403);
  });

  it('autoriza ADMIN en CRUD de pronósticos', async () => {
    await request(baseUrl)
      .post('/predictions')
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .send(predictionPayload)
      .expect(201);
    await request(baseUrl)
      .patch(`/predictions/${PREDICTION_ID}`)
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .send({ status: 'WON' })
      .expect(200);
    await request(baseUrl)
      .delete(`/predictions/${PREDICTION_ID}`)
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .expect(200);

    expect(predictionsService.create).toHaveBeenCalledTimes(1);
    expect(predictionsService.update).toHaveBeenCalledTimes(1);
    expect(predictionsService.remove).toHaveBeenCalledTimes(1);
  });

  it('autoriza ADMIN para administrar membresías', async () => {
    await request(baseUrl)
      .post(`/memberships/activate/${USER_ID}`)
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .send({ plan: MembershipPlan.ONE_MONTH })
      .expect(201);
    await request(baseUrl)
      .patch(`/memberships/cancel/${USER_ID}`)
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .expect(200);

    expect(membershipsService.activateMembership).toHaveBeenCalledTimes(1);
    expect(membershipsService.cancelMembership).toHaveBeenCalledTimes(1);
  });

  it('rechaza ADMIN sin token CSRF y acepta cookie más cabecera válidas', async () => {
    await request(baseUrl)
      .post('/predictions')
      .set('Cookie', adminCookie)
      .send(predictionPayload)
      .expect(403);

    await request(baseUrl)
      .post('/predictions')
      .set('Cookie', [adminCookie, `csrf_token=${CSRF_TOKEN}`])
      .set('X-CSRF-Token', CSRF_TOKEN)
      .send(predictionPayload)
      .expect(201);
  });
});
