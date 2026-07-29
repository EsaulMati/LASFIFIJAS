import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createCorsOptions,
  normalizeOrigin,
  parseFrontendOrigins,
} from './cors.config';

const FRONTEND_ORIGIN = 'https://lasfifijas-api.vercel.app';

@Controller('auth')
class CorsTestController {
  @Get('login')
  login() {
    return {};
  }

  @Get('me')
  me() {
    return {};
  }
}

describe('CORS configuration', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CorsTestController],
    }).compile();
    app = module.createNestApplication();
    app.enableCors(createCorsOptions(FRONTEND_ORIGIN));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([
    ['/auth/login', 'POST'],
    ['/auth/me', 'GET'],
  ])(
    'autoriza el preflight de %s para el frontend configurado',
    async (path, method) => {
      await request(app.getHttpServer())
        .options(path)
        .set('Origin', FRONTEND_ORIGIN)
        .set('Access-Control-Request-Method', method)
        .set('Access-Control-Request-Headers', 'content-type')
        .expect(204)
        .expect('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
        .expect('Access-Control-Allow-Credentials', 'true');
    },
  );

  it('no autoriza un origen desconocido ni lo convierte en error 500', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://unknown.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).not.toBe(500);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });

  it('normaliza barras finales, espacios y varios dominios', () => {
    expect(
      parseFrontendOrigins(
        ' https://lasfifijas-api.vercel.app/, https://admin.example.com/// ',
      ),
    ).toEqual([
      'https://lasfifijas-api.vercel.app',
      'https://admin.example.com',
    ]);
    expect(normalizeOrigin('https://lasfifijas-api.vercel.app///')).toBe(
      FRONTEND_ORIGIN,
    );
  });

  it('permite solicitudes internas sin Origin', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(200);
  });
});
