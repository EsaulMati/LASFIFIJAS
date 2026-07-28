import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimit } from '../security/rate-limit.decorator';
import { RateLimitGuard } from '../security/rate-limit.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { MembershipsService } from './memberships.service';
import { AuthUser } from '../auth/auth-user.type';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post('purchase')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RateLimitGuard, CsrfGuard)
  purchase(
    @Req() request: Request & { user: AuthUser },
    @Body() activateMembershipDto: ActivateMembershipDto,
  ) {
    return this.membershipsService.activateMembership(
      request.user.userId,
      activateMembershipDto.plan,
    );
  }

  @Post('activate/:userId')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RolesGuard, RateLimitGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  activate(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() activateMembershipDto: ActivateMembershipDto,
  ) {
    return this.membershipsService.activateMembership(
      userId,
      activateMembershipDto.plan,
    );
  }

  @Patch('cancel/:userId')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RolesGuard, RateLimitGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  cancel(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.membershipsService.cancelMembership(userId);
  }
}
