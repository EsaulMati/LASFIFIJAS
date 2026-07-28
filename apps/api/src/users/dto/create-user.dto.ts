import {
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PASSWORD_MIN_LENGTH, passwordPatterns } from '../password-rules';
import { normalizeEmail, normalizeText } from '../../common/dto-transforms';

export class CreateUserDto {
  @Transform(normalizeText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(254)
  email: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  })
  @MaxLength(128, {
    message: 'La contraseña no puede superar los 128 caracteres',
  })
  @Matches(passwordPatterns.uppercase, {
    message: 'La contraseña debe incluir al menos una letra mayúscula',
  })
  @Matches(passwordPatterns.lowercase, {
    message: 'La contraseña debe incluir al menos una letra minúscula',
  })
  @Matches(passwordPatterns.number, {
    message: 'La contraseña debe incluir al menos un número',
  })
  @Matches(passwordPatterns.symbol, {
    message: 'La contraseña debe incluir al menos un símbolo',
  })
  password: string;
}
