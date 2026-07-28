import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('normaliza el correo antes de validarlo', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  CLIENTE@EXAMPLE.COM ',
      password: 'Segura123!',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.email).toBe('cliente@example.com');
  });
});
