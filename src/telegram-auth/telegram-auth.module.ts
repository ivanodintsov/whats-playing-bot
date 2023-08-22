import { Module } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';

@Module({
  providers: [TelegramAuthService],
  exports: [TelegramAuthService],
})
export class TelegramAuthModule {}
