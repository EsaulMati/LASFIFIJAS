import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

export function mapPrismaException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException('El recurso ya existe');
    }
    if (error.code === 'P2025') {
      return new NotFoundException('El recurso solicitado no existe');
    }
    if (['P2003', 'P2011', 'P2014'].includes(error.code)) {
      return new BadRequestException(
        'Los datos proporcionados no cumplen las relaciones requeridas',
      );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestException('Los datos proporcionados no son válidos');
  }

  return new InternalServerErrorException(
    'Ocurrió un error interno. Inténtalo nuevamente',
  );
}

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const exception = mapPrismaException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
