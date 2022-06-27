import { Test, TestingModule } from '@nestjs/testing';
import { MusicServicesService } from './music-services.service';

describe('MusicServicesService', () => {
  let service: MusicServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicServicesService],
    }).compile();

    service = module.get<MusicServicesService>(MusicServicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
