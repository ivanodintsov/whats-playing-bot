import { Test, TestingModule } from '@nestjs/testing';
import { TidalParserService } from './tidal-parser.service';

describe('TidalParserService', () => {
  let service: TidalParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TidalParserService],
    }).compile();

    service = module.get<TidalParserService>(TidalParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
