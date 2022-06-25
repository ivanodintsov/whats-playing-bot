import { Test, TestingModule } from '@nestjs/testing';
import { DeezerServiceService } from './deezer-service.service';

describe('DeezerServiceService', () => {
  let service: DeezerServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeezerServiceService],
    }).compile();

    service = module.get<DeezerServiceService>(DeezerServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
