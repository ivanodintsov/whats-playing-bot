import { Test, TestingModule } from '@nestjs/testing';
import { ChannelPostingService } from './channel-posting.service';

describe('ChannelPostingService', () => {
  let service: ChannelPostingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChannelPostingService],
    }).compile();

    service = module.get<ChannelPostingService>(ChannelPostingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
