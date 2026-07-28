import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { securityHeaders } from './security-headers';

@Controller('security-header-check')
class SecurityHeaderController {
  @Get()
  check() {
    return { ok: true };
  }
}

describe('API security headers', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SecurityHeaderController],
    }).compile();
    app = module.createNestApplication();
    app.use(securityHeaders);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => app.close());

  it('envía headers defensivos sin alterar la respuesta JSON', async () => {
    const response = await request(baseUrl)
      .get('/security-header-check')
      .expect(200, { ok: true });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
  });
});
