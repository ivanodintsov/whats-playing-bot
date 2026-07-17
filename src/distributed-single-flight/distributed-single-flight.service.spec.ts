import { Test, TestingModule } from '@nestjs/testing';
import { DistributedSingleFlightService } from './distributed-single-flight.service';

describe('DistributedSingleFlightService', () => {
  let service: DistributedSingleFlightService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributedSingleFlightService],
    }).compile();

    service = module.get<DistributedSingleFlightService>(DistributedSingleFlightService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
