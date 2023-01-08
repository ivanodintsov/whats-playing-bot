import { Test, TestingModule } from '@nestjs/testing';
import { TrackStatisticsService } from './track-statistics.service';

describe('TrackStatisticsService', () => {
  let service: TrackStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackStatisticsService],
    }).compile();

    service = module.get<TrackStatisticsService>(TrackStatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
