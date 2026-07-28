import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { RateLimitService } from '../security/rate-limit.service';

describe('AuthController', () => {
  let controller: AuthController;
  const login = jest.fn<
    ReturnType<AuthService['login']>,
    Parameters<AuthService['login']>
  >();
  const getCurrentUser = jest.fn<
    ReturnType<AuthService['getCurrentUser']>,
    Parameters<AuthService['getCurrentUser']>
  >();
  const authService: Pick<AuthService, 'login' | 'getCurrentUser'> = {
    login,
    getCurrentUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RateLimitService,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('guarda el JWT solo en la cookie y devuelve únicamente el usuario', async () => {
    const user = {
      id: 'user-1',
      name: 'Cliente',
      email: 'cliente@example.com',
      role: Role.CLIENT,
    };
    login.mockResolvedValue({ token: 'jwt-test-token', user });
    const cookie: Response['cookie'] = jest.fn();

    const result = await controller.login(
      { email: user.email, password: 'Segura123!' },
      { cookie },
    );

    expect(cookie).toHaveBeenCalledWith(
      'auth_token',
      'jwt-test-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(result).toEqual({ user });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('token');
  });
});
