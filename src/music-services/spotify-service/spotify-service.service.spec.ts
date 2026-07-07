import { Test, TestingModule } from '@nestjs/testing';
import { SpotifyServiceService } from './spotify-service.service';

describe('SpotifyServiceService', () => {
  let service: SpotifyServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpotifyServiceService],
    }).compile();

    service = module.get<SpotifyServiceService>(SpotifyServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
