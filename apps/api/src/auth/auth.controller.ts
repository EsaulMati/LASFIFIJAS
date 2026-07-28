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
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth-user.type';
import { randomBytes } from 'node:crypto';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimit } from '../security/rate-limit.decorator';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { CSRF_COOKIE } from '../security/security.constants';

const AUTH_COOKIE = 'auth_token';

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
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
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
    response.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { csrfToken };
  }

  @Post('logout')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @UseGuards(RateLimitGuard, CsrfGuard)
  logout(@Res({ passthrough: true }) response: Pick<Response, 'clearCookie'>) {
    response.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Sesión cerrada correctamente' };
  }
}
