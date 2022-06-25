import { Test, TestingModule } from '@nestjs/testing';
import { DeezerServiceController } from './deezer-service.controller';

describe('DeezerServiceController', () => {
  let controller: DeezerServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeezerServiceController],
    }).compile();

    controller = module.get<DeezerServiceController>(DeezerServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
