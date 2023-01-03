import { Test, TestingModule } from '@nestjs/testing';
import { SongsLyricsService } from './songs-lyrics.service';

describe('SongsLyricsService', () => {
  let service: SongsLyricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SongsLyricsService],
    }).compile();

    service = module.get<SongsLyricsService>(SongsLyricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
