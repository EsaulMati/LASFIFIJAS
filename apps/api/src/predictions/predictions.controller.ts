import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user.type';
import { Role } from '@prisma/client';
import { CsrfGuard } from '../security/csrf.guard';
import { RateLimit } from '../security/rate-limit.decorator';
import { RateLimitGuard } from '../security/rate-limit.guard';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  // Público
  @Get()
  findAll() {
    return this.predictionsService.findAll();
  }

  // Usuario autenticado: ve según su membresía
  @Get('my')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  findForUser(@Req() req: Request & { user: AuthUser }) {
    return this.predictionsService.findAvailableForUser(
      req.user.userId,
      req.user.role,
    );
  }

  // Solo ADMIN
  @Post()
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RolesGuard, RateLimitGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  create(@Body() createPredictionDto: CreatePredictionDto) {
    return this.predictionsService.create(createPredictionDto);
  }

  // Solo ADMIN
  @Patch(':id')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RolesGuard, RateLimitGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePredictionDto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(id, updatePredictionDto);
  }

  // Solo ADMIN
  @Delete(':id')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @UseGuards(AuthGuard('jwt'), RolesGuard, RateLimitGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.predictionsService.remove(id);
  }
}
