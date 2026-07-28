import { ConflictException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mapPrismaException } from './prisma-exception.filter';

function knownPrismaError(code: string, message = 'consulta interna sensible') {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: 'test',
  });
}

describe('Prisma exception mapping', () => {
  it('mapea duplicados a 409', () => {
    expect(mapPrismaException(knownPrismaError('P2002')).getStatus()).toBe(
      HttpStatus.CONFLICT,
    );
  });

  it('mapea recursos inexistentes a 404', () => {
    expect(mapPrismaException(knownPrismaError('P2025')).getStatus()).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('conserva excepciones HTTP controladas como registro duplicado', () => {
    const conflict = new ConflictException('Correo duplicado');
    expect(mapPrismaException(conflict)).toBe(conflict);
  });

  it('no filtra detalles de errores desconocidos', () => {
    const exception = mapPrismaException(
      new Error('DATABASE_URL=secreto; SELECT passwordHash FROM User'),
    );
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(exception.getResponse())).not.toContain('secreto');
    expect(JSON.stringify(exception.getResponse())).not.toContain(
      'passwordHash',
    );
  });
});
