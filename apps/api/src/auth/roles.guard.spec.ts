import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

class ProtectedController {
  protectedAction(this: void) {}
}

function createContext(user?: { role: string }) {
  const controller = new ProtectedController();
  const handler = controller.protectedAction;
  Reflect.defineMetadata(ROLES_KEY, [Role.ADMIN], handler);
  return new ExecutionContextHost([{ user }], ProtectedController, handler);
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const administrativeOperations = [
    'crear pronósticos',
    'editar pronósticos',
    'eliminar pronósticos',
    'activar membresías',
    'cancelar membresías',
  ];

  it.each(administrativeOperations)('autoriza ADMIN para %s', () => {
    expect(guard.canActivate(createContext({ role: Role.ADMIN }))).toBe(true);
  });

  it.each(administrativeOperations)('rechaza CLIENT para %s', () => {
    const context = createContext({ role: Role.CLIENT });
    expect(guard.canActivate(context)).toBe(false);
    expect(() => {
      if (!guard.canActivate(context)) throw new ForbiddenException();
    }).toThrow(ForbiddenException);
  });

  it.each([[undefined], ['INVALID']])(
    'rechaza un rol ausente o inválido: %s',
    (role) => {
      const context = createContext(role ? { role } : undefined);
      expect(guard.canActivate(context)).toBe(false);
      expect(() => {
        if (!guard.canActivate(context)) throw new ForbiddenException();
      }).toThrow(ForbiddenException);
    },
  );
});
