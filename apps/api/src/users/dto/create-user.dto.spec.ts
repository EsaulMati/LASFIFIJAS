import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

async function passwordMessages(password: string) {
  const dto = new CreateUserDto();
  dto.name = 'Cliente';
  dto.email = 'cliente@example.com';
  dto.password = password;
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateUserDto password rules', () => {
  it('normaliza nombre y correo', async () => {
    const dto = plainToInstance(CreateUserDto, {
      name: '  Cliente   Nuevo ',
      email: ' CLIENTE@EXAMPLE.COM ',
      password: 'Segura123!',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.name).toBe('Cliente Nuevo');
    expect(dto.email).toBe('cliente@example.com');
  });

  it('rechaza campos internos enviados por el cliente', async () => {
    const dto = plainToInstance(CreateUserDto, {
      name: 'Cliente',
      email: 'cliente@example.com',
      password: 'Segura123!',
      role: 'ADMIN',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });

  it('acepta una contraseña válida', async () => {
    await expect(passwordMessages('Segura123!')).resolves.toEqual([]);
  });

  it('no recorta ni transforma los símbolos de la contraseña', async () => {
    const password = ' Segura123!# ';
    const dto = plainToInstance(CreateUserDto, {
      name: 'Cliente',
      email: 'cliente@example.com',
      password,
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.password).toBe(password);
  });

  it.each([
    ['Corta1!', 'al menos 8 caracteres'],
    ['segura123!', 'letra mayúscula'],
    ['SEGURA123!', 'letra minúscula'],
    ['SeguraPass!', 'un número'],
    ['Segura123', 'un símbolo'],
  ])('rechaza %s por falta de %s', async (password, expected) => {
    expect(await passwordMessages(password)).toEqual(
      expect.arrayContaining([expect.stringContaining(expected)]),
    );
  });
});
