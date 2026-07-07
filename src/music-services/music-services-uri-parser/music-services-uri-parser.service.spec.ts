import { Test, TestingModule } from '@nestjs/testing';
import { MusicServicesUriParserService } from './music-services-uri-parser.service';

describe('MusicServicesUriParserService', () => {
  let service: MusicServicesUriParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicServicesUriParserService],
    }).compile();

    service = module.get<MusicServicesUriParserService>(MusicServicesUriParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
