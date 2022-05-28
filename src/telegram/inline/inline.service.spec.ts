import { Test, TestingModule } from '@nestjs/testing';
import { InlineService } from './inline.service';

describe('InlineService', () => {
  let service: InlineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InlineService],
    }).compile();

    service = module.get<InlineService>(InlineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
