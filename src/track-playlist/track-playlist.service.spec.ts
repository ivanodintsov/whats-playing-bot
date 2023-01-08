import { Test, TestingModule } from '@nestjs/testing';
import { TrackPlaylistService } from './track-playlist.service';

describe('TrackPlaylistService', () => {
  let service: TrackPlaylistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackPlaylistService],
    }).compile();

    service = module.get<TrackPlaylistService>(TrackPlaylistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
