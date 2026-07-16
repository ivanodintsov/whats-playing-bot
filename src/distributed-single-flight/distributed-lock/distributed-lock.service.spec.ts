import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';

describe('DistributedLockService', () => {
  let service: DistributedLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributedLockService],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
