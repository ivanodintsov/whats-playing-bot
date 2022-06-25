import { Test, TestingModule } from '@nestjs/testing';
import { MusicServicesController } from './music-services.controller';

describe('MusicServicesController', () => {
  let controller: MusicServicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MusicServicesController],
    }).compile();

    controller = module.get<MusicServicesController>(MusicServicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
