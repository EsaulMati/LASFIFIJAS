import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PredictionStatus } from '@prisma/client';
import { CreatePredictionDto } from './create-prediction.dto';
import { UpdatePredictionDto } from './update-prediction.dto';

const validPrediction = {
  sport: 'Fútbol',
  league: 'Liga 1',
  homeTeam: 'Alianza Lima',
  awayTeam: 'Universitario',
  prediction: 'Más de 1.5 goles',
  odds: 1.85,
  matchDate: '2026-08-01T20:00:00.000Z',
  isPremium: false,
};

async function validatePayload<T extends object>(
  dtoClass: new () => T,
  payload: object,
) {
  return validate(plainToInstance(dtoClass, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('Prediction DTO validation', () => {
  it('acepta y normaliza un pronóstico válido', async () => {
    const dto = plainToInstance(CreatePredictionDto, {
      ...validPrediction,
      sport: '  Fútbol   internacional ',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.sport).toBe('Fútbol internacional');
  });

  it('rechaza propiedades no permitidas', async () => {
    const errors = await validatePayload(CreatePredictionDto, {
      ...validPrediction,
      status: PredictionStatus.WON,
    });
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it.each([
    ['texto vacío', { prediction: '   ' }],
    ['cuota cero', { odds: 0 }],
    ['cuota negativa', { odds: -1 }],
    ['cuota NaN', { odds: Number.NaN }],
    ['cuota infinita', { odds: Number.POSITIVE_INFINITY }],
    ['fecha inválida', { matchDate: 'no-es-una-fecha' }],
  ])('rechaza %s', async (_description, override) => {
    await expect(
      validatePayload(CreatePredictionDto, {
        ...validPrediction,
        ...override,
      }),
    ).resolves.not.toHaveLength(0);
  });

  it('rechaza un estado de actualización desconocido', async () => {
    await expect(
      validatePayload(UpdatePredictionDto, { status: 'UNKNOWN' }),
    ).resolves.not.toHaveLength(0);
  });

  it('rechaza valores vacíos aunque sean opcionales en actualización', async () => {
    await expect(
      validatePayload(UpdatePredictionDto, { homeTeam: '   ' }),
    ).resolves.not.toHaveLength(0);
  });
});
