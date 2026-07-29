import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request, { SuperAgentTest } from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { RateLimitService } from '../security/rate-limit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const TEST_SECRET = 'logout-http-test-secret';

describe('logout over HTTP', () => {
  let app: INestApplication;
  let agent: SuperAgentTest;
  const user = {
    id: 'logout-user',
    name: 'Cliente',
    email: 'logout@example.com',
    role: Role.CLIENT,
  };
  const authService = {
    login: jest.fn(),
    getCurrentUser: jest.fn().mockResolvedValue(user),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: TEST_SECRET })],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        CsrfGuard,
        RateLimitGuard,
        RateLimitService,
        { provide: AuthService, useValue: authService },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn().mockResolvedValue(user) } },
        },
        {
          provide: ConfigService,
          useValue: { get: () => TEST_SECRET },
        },
      ],
    }).compile();
    const jwtService = module.get(JwtService);
    authService.login.mockResolvedValue({
      token: await jwtService.signAsync({ sub: user.id }),
      user,
    });

    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    agent = request.agent(await app.getUrl());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza logout sin CSRF y elimina la sesión con el token correcto', async () => {
    await agent
      .post('/auth/login')
      .send({ email: user.email, password: 'test-password' })
      .expect(201);
    await agent.get('/auth/me').expect(200);

    await agent.post('/auth/logout').expect(403);
    await agent.get('/auth/me').expect(200);

    const csrfResponse = await agent.get('/auth/csrf').expect(200);
    const csrfBody = csrfResponse.body as { csrfToken: string };
    const logoutResponse = await agent
      .post('/auth/logout')
      .set('X-CSRF-Token', csrfBody.csrfToken)
      .expect(201);

    expect(logoutResponse.get('Set-Cookie')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^auth_token=;/),
        expect.stringMatching(/^csrf_token=;/),
      ]),
    );
    await agent.get('/auth/me').expect(401);
  });
});
