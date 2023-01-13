import { Test, TestingModule } from '@nestjs/testing';
import { SongsInfoController } from './songs-info.controller';

describe('SongsInfoController', () => {
  let controller: SongsInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongsInfoController],
    }).compile();

    controller = module.get<SongsInfoController>(SongsInfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
