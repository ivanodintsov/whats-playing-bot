import { Test, TestingModule } from '@nestjs/testing';
import { SongsLyricsController } from './songs-lyrics.controller';

describe('SongsLyricsController', () => {
  let controller: SongsLyricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongsLyricsController],
    }).compile();

    controller = module.get<SongsLyricsController>(SongsLyricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
