import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeText } from '../../common/dto-transforms';

export class CreatePredictionDto {
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sport: string;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  league: string;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeTeam: string;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  awayTeam: string;

  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prediction: string;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsPositive()
  odds: number;

  @IsDateString({ strict: true })
  matchDate: string;

  @IsBoolean()
  isPremium: boolean;
}
