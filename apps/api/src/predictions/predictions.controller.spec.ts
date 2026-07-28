import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { RateLimitService } from '../security/rate-limit.service';

describe('PredictionsController', () => {
  let controller: PredictionsController;
  const predictionsService: Pick<
    PredictionsService,
    'findAll' | 'findAvailableForUser' | 'create' | 'update' | 'remove'
  > = {
    findAll: jest.fn(),
    findAvailableForUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionsController],
      providers: [
        RateLimitService,
        { provide: PredictionsService, useValue: predictionsService },
      ],
    }).compile();

    controller = module.get<PredictionsController>(PredictionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
