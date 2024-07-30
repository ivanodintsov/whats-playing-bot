import { ExtractJwt } from 'passport-jwt';
import * as crypto from 'crypto';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramBaseStrategy } from './telegram-auth-base.strategy';
import { PassportTelegramUser } from './types';

@Injectable()
export class TelegramStrategy extends PassportStrategy(TelegramBaseStrategy) {
  constructor(
    private readonly appConfig: ConfigService,
    private authService: TelegramAuthService,
  ) {
    super({});
  }

  protected getBotToken(): Buffer {
    if (!this.hashedBotToken) {
      this.hashedBotToken = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.appConfig.get<string>('TELEGRAM_BOT_TOKEN'))
        .digest();
    }

    return this.hashedBotToken;
  }

  async validate(payload: PassportTelegramUser) {
    const user = await this.authService.getUser({
      tgId: `${payload.user.id}`,
    });

    return user;
  }
}
