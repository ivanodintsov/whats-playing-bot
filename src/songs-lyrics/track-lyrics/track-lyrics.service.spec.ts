import { Test, TestingModule } from '@nestjs/testing';
import { TrackLyricsService } from './track-lyrics.service';

describe('TrackLyricsService', () => {
  let service: TrackLyricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackLyricsService],
    }).compile();

    service = module.get<TrackLyricsService>(TrackLyricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
