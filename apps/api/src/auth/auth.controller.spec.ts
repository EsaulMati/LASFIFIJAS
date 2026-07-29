import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthController,
  getAuthCookieOptions,
  getCsrfCookieOptions,
} from './auth.controller';
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
    jest.clearAllMocks();
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

  it('usa una cookie cross-site segura en producción al iniciar sesión', async () => {
    const user = {
      id: 'user-production',
      name: 'Cliente',
      email: 'production@example.com',
      role: Role.CLIENT,
    };
    login.mockResolvedValue({ token: 'production-test-token', user });
    const cookie: Response['cookie'] = jest.fn();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await controller.login(
        { email: user.email, password: 'Segura123!' },
        { cookie },
      );
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }

    expect(cookie).toHaveBeenCalledWith(
      'auth_token',
      'production-test-token',
      expect.objectContaining(getAuthCookieOptions('production')),
    );
  });

  it('usa las mismas opciones relevantes al eliminar la cookie', () => {
    const clearCookie: Response['clearCookie'] = jest.fn();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      controller.logout({ clearCookie });
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }

    expect(clearCookie).toHaveBeenCalledWith(
      'auth_token',
      getAuthCookieOptions('production'),
    );
  });

  it('mantiene SameSite Lax y Secure desactivado en desarrollo', () => {
    expect(getAuthCookieOptions('development')).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('crea la cookie CSRF cross-site en producción', () => {
    const cookie: Response['cookie'] = jest.fn();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      controller.issueCsrfToken({ cookie });
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }

    expect(cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      getCsrfCookieOptions('production'),
    );
    expect(getCsrfCookieOptions('production')).toEqual({
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });

  it('elimina también la cookie CSRF después de un logout válido', () => {
    const clearCookie: Response['clearCookie'] = jest.fn();

    controller.logout({ clearCookie });

    expect(clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      getCsrfCookieOptions(),
    );
  });
});
