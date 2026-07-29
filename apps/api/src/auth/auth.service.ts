import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { AuthUser } from './auth-user.type';
import { getEffectiveMembershipStatus } from '../memberships/membership.utils';
import { MembershipStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordIsValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getCurrentUser(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membership: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    if (user.membership) {
      const now = new Date();
      const effectiveStatus = getEffectiveMembershipStatus(
        user.membership,
        now,
      );

      if (
        effectiveStatus === MembershipStatus.EXPIRED &&
        user.membership.status === MembershipStatus.ACTIVE &&
        user.membership.endDate <= now
      ) {
        await this.prisma.membership.updateMany({
          where: {
            id: user.membership.id,
            status: MembershipStatus.ACTIVE,
            endDate: { lte: now },
          },
          data: { status: MembershipStatus.EXPIRED },
        });
      }

      user.membership.status = effectiveStatus;
    }

    return user;
  }
}
