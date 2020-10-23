import { Test, TestingModule } from '@nestjs/testing';
import { SongWhipService } from './song-whip.service';

describe('SongWhipService', () => {
  let service: SongWhipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SongWhipService],
    }).compile();

    service = module.get<SongWhipService>(SongWhipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
