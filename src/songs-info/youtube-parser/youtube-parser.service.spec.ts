import { Test, TestingModule } from '@nestjs/testing';
import { YoutubeParserService } from './youtube-parser.service';

describe('YoutubeParserService', () => {
  let service: YoutubeParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YoutubeParserService],
    }).compile();

    service = module.get<YoutubeParserService>(YoutubeParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
