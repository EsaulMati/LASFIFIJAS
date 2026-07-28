import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService registration', () => {
  it('devuelve conflicto si el correo ya existe y no intenta crear el usuario', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
        create: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = module.get(UsersService);

    await expect(
      service.create({
        name: 'Cliente',
        email: 'cliente@example.com',
        password: 'Segura123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
