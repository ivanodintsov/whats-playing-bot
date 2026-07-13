import { Test, TestingModule } from '@nestjs/testing';
import { TokensPoolService } from './tokens-pool.service';

describe('TokensPoolService', () => {
  let service: TokensPoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokensPoolService],
    }).compile();

    service = module.get<TokensPoolService>(TokensPoolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
