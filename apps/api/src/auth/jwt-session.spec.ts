import { JwtService } from '@nestjs/jwt';

describe('JWT session expiration', () => {
  const jwt = new JwtService({ secret: 'test-only-secret' });

  it('acepta una sesión vigente', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: '1h' });
    await expect(jwt.verifyAsync(token)).resolves.toMatchObject({
      sub: 'user-1',
    });
  });

  it('rechaza una sesión vencida', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: -1 });
    await expect(jwt.verifyAsync(token)).rejects.toThrow();
  });
});
