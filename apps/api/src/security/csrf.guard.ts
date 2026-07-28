import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE, CSRF_HEADER } from './security.constants';

function readCookie(request: Request, name: string) {
  const cookie = (request.headers.cookie?.split(';') ?? []).find((item) =>
    item.trim().startsWith(`${name}=`),
  );
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : '';
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = readCookie(request, CSRF_COOKIE);
    const header = request.headers[CSRF_HEADER];
    const headerToken = typeof header === 'string' ? header : '';
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (
      !cookieToken ||
      !headerToken ||
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException('Token CSRF ausente o inválido');
    }

    return true;
  }
}
