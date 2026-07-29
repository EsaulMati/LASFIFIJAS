import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth-user.type';
import { randomBytes } from 'node:crypto';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimit } from '../security/rate-limit.decorator';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { CSRF_COOKIE } from '../security/security.constants';

const AUTH_COOKIE = 'auth_token';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function getAuthCookieOptions(
  nodeEnv = process.env.NODE_ENV,
): CookieOptions {
  const isProduction = nodeEnv === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function getCsrfCookieOptions(
  nodeEnv = process.env.NODE_ENV,
): CookieOptions {
  const isProduction = nodeEnv === 'production';

  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  @UseGuards(RateLimitGuard)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Pick<Response, 'cookie'>,
  ) {
    const result = await this.authService.login(loginDto);

    response.cookie(AUTH_COOKIE, result.token, {
      ...getAuthCookieOptions(),
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return { user: result.user };
  }

  @Get('me')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  getMe(@Req() request: Request & { user: AuthUser }) {
    return this.authService.getCurrentUser(request.user);
  }

  @Get('csrf')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @UseGuards(RateLimitGuard)
  issueCsrfToken(
    @Res({ passthrough: true }) response: Pick<Response, 'cookie'>,
  ) {
    const csrfToken = randomBytes(32).toString('base64url');
    response.cookie(CSRF_COOKIE, csrfToken, getCsrfCookieOptions());
    return { csrfToken };
  }

  @Post('logout')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @UseGuards(RateLimitGuard, CsrfGuard)
  logout(@Res({ passthrough: true }) response: Pick<Response, 'clearCookie'>) {
    response.clearCookie(AUTH_COOKIE, {
      ...getAuthCookieOptions(),
    });
    response.clearCookie(CSRF_COOKIE, getCsrfCookieOptions());

    return { message: 'Sesión cerrada correctamente' };
  }
}
