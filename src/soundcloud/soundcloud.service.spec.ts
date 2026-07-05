import { Test, TestingModule } from '@nestjs/testing';
import { SoundcloudService } from './soundcloud.service';

describe('SoundcloudService', () => {
  let service: SoundcloudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoundcloudService],
    }).compile();

    service = module.get<SoundcloudService>(SoundcloudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
