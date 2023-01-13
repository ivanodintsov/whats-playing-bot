import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyParserService } from './spotify-parser.service';

describe('SpotifyParserService', () => {
  let service: SpotifyParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpotifyParserService],
    }).compile();

    service = module.get<SpotifyParserService>(SpotifyParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
