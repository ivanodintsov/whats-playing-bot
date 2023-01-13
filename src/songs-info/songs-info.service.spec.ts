import { Test, TestingModule } from '@nestjs/testing';
import { SongsInfoService } from './songs-info.service';

describe('SongsInfoService', () => {
  let service: SongsInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SongsInfoService],
    }).compile();

    service = module.get<SongsInfoService>(SongsInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
