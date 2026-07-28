import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AuthUser } from '../auth/auth-user.type';
import { RATE_LIMIT_KEY, RateLimitOptions } from './security.constants';
import { RateLimitService } from './rate-limit.service';

type RateLimitedRequest = Request & { user?: AuthUser };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimits: RateLimitService,
  ) {}

  canActivate(context: ExecutionContext) {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const identity = request.user?.userId ?? request.ip ?? 'unknown';
    const key = `${context.getClass().name}:${context.getHandler().name}:${identity}`;
    const result = this.rateLimits.consume(
      key,
      options.limit,
      options.windowMs,
    );

    response.setHeader('RateLimit-Limit', options.limit.toString());
    response.setHeader('RateLimit-Reset', result.retryAfterSeconds.toString());

    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfterSeconds.toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Demasiadas solicitudes. Inténtalo nuevamente más tarde',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
