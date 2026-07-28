import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../common/dto-transforms';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
