import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

describe('authentication rate limits over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;

  const authService: Pick<AuthService, 'login' | 'getCurrentUser'> = {
    login: jest.fn().mockResolvedValue({
      token: 'test-token',
      user: {
        id: 'user-1',
        name: 'Cliente',
        email: 'cliente@example.com',
        role: Role.CLIENT,
      },
    }),
    getCurrentUser: jest.fn(),
  };
  const usersService: Pick<UsersService, 'create' | 'findAll'> = {
    create: jest.fn().mockResolvedValue({ id: 'user-1' }),
    findAll: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        RateLimitGuard,
        RateLimitService,
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => app.close());

  it('limita login después de cinco intentos y responde 429', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(baseUrl)
        .post('/auth/login')
        .send({ email: 'cliente@example.com', password: 'Segura123!' })
        .expect(201);
    }

    const response = await request(baseUrl)
      .post('/auth/login')
      .send({ email: 'otro@example.com', password: 'Segura123!' })
      .expect(429);

    expect(response.body).toMatchObject({
      statusCode: 429,
      message: 'Demasiadas solicitudes. Inténtalo nuevamente más tarde',
    });
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('limita registro después de tres intentos sin revelar correos', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(baseUrl)
        .post('/users')
        .send({
          name: 'Cliente',
          email: `cliente${attempt}@example.com`,
          password: 'Segura123!',
        })
        .expect(201);
    }

    const response = await request(baseUrl)
      .post('/users')
      .send({
        name: 'Cliente',
        email: 'registrado@example.com',
        password: 'Segura123!',
      })
      .expect(429);

    expect(response.text).not.toContain('registrado@example.com');
  });
});
