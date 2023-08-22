import { Test, TestingModule } from '@nestjs/testing';
import { TelegramAuthService } from './telegram-auth.service';

describe('TelegramAuthService', () => {
  let service: TelegramAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramAuthService],
    }).compile();

    service = module.get<TelegramAuthService>(TelegramAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
