import { PredictionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeText } from '../../common/dto-transforms';

export class UpdatePredictionDto {
  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sport?: string;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  league?: string;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeTeam?: string;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  awayTeam?: string;

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prediction?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsPositive()
  odds?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  matchDate?: string;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsEnum(PredictionStatus)
  status?: PredictionStatus;
}
