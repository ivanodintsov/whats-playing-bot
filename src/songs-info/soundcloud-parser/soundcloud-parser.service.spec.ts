import { Test, TestingModule } from '@nestjs/testing';
import { SoundcloudParserService } from './soundcloud-parser.service';

describe('SoundcloudParserService', () => {
  let service: SoundcloudParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoundcloudParserService],
    }).compile();

    service = module.get<SoundcloudParserService>(SoundcloudParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
