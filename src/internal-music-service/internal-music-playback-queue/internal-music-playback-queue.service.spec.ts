import { Test, TestingModule } from '@nestjs/testing';
import { InternalMusicPlaybackQueueService } from './internal-music-playback-queue.service';

describe('InternalMusicPlaybackQueueService', () => {
  let service: InternalMusicPlaybackQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternalMusicPlaybackQueueService],
    }).compile();

    service = module.get<InternalMusicPlaybackQueueService>(InternalMusicPlaybackQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
