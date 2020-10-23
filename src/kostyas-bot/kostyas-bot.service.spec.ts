import { Test, TestingModule } from '@nestjs/testing';
import { KostyasBotService } from './kostyas-bot.service';

describe('KostyasBotService', () => {
  let service: KostyasBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KostyasBotService],
    }).compile();

    service = module.get<KostyasBotService>(KostyasBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
