import { Test, TestingModule } from '@nestjs/testing';
import { LyricsService } from './lyrics.service';

describe('LyricsService', () => {
  let service: LyricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LyricsService],
    }).compile();

    service = module.get<LyricsService>(LyricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
