import { Test, TestingModule } from '@nestjs/testing';
import { SoundcloudController } from './soundcloud.controller';

describe('SoundcloudController', () => {
  let controller: SoundcloudController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SoundcloudController],
    }).compile();

    controller = module.get<SoundcloudController>(SoundcloudController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
