import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('Registration and login flow', () => {
  it('stores one hash, creates a session immediately, and rejects a wrong password', async () => {
    let storedUser:
      | {
          id: string;
          name: string;
          email: string;
          passwordHash: string;
          role: Role;
          createdAt: Date;
        }
      | undefined;
    const prisma = {
      user: {
        findUnique: jest.fn(({ where }: { where: { email: string } }) =>
          Promise.resolve(
            storedUser?.email === where.email ? storedUser : null,
          ),
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: { name: string; email: string; passwordHash: string };
          }) => {
            storedUser = {
              id: 'new-user',
              role: Role.CLIENT,
              createdAt: new Date(),
              ...data,
            };
            return Promise.resolve({
              id: storedUser.id,
              name: storedUser.name,
              email: storedUser.email,
              role: storedUser.role,
              createdAt: storedUser.createdAt,
            });
          },
        ),
      },
    };
    const jwtService: Pick<JwtService, 'signAsync'> = {
      signAsync: jest.fn().mockResolvedValue('valid-session-token'),
    };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    const usersService = module.get(UsersService);
    const authService = module.get(AuthService);
    const credentials = {
      email: 'cliente@example.com',
      password: 'Segura123!#',
    };

    await usersService.create({ name: 'Cliente', ...credentials });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(storedUser?.passwordHash).not.toBe(credentials.password);
    expect(storedUser?.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(
      bcrypt.compare(credentials.password, storedUser!.passwordHash),
    ).resolves.toBe(true);
    await expect(authService.login(credentials)).resolves.toMatchObject({
      token: 'valid-session-token',
      user: { id: 'new-user', email: credentials.email },
    });
    await expect(
      authService.login({ ...credentials, password: 'Incorrecta123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
