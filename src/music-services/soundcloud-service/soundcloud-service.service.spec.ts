import { Test, TestingModule } from '@nestjs/testing';
import { SoundcloudServiceService } from './soundcloud-service.service';

describe('SoundcloudServiceService', () => {
  let service: SoundcloudServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoundcloudServiceService],
    }).compile();

    service = module.get<SoundcloudServiceService>(SoundcloudServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
