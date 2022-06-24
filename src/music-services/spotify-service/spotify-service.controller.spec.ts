import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyServiceController } from './spotify-service.controller';

describe('SpotifyServiceController', () => {
  let controller: SpotifyServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotifyServiceController],
    }).compile();

    controller = module.get<SpotifyServiceController>(SpotifyServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
