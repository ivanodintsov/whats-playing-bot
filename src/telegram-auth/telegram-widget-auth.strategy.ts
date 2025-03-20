import * as crypto from 'crypto';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as queryString from 'qs';
import { Request } from 'express';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramBaseStrategy } from './telegram-auth-base.strategy';
import { PassportTelegramUser } from './types';

class TelegramWidgetBaseStrategy extends TelegramBaseStrategy {
  readonly name: string = 'telegram-widget';
}

export const whitelistParams = [
  'id',
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'auth_date',
];

const transformPayload = (payload: any) => {
  return Object.keys(payload)
    .sort()
    .filter(d => whitelistParams.includes(d))
    .map(key => `${key}=${payload[key]}`)
    .join('\n');
};

@Injectable()
export class TelegramWidgetStrategy extends PassportStrategy(
  TelegramWidgetBaseStrategy,
) {
  constructor(
    private readonly appConfig: ConfigService,
    private authService: TelegramAuthService,
  ) {
    super({});
  }

  protected getBotToken(): Buffer {
    if (!this.hashedBotToken) {
      this.hashedBotToken = crypto
        .createHash('sha256')
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

  protected validateQuery(req: Request): boolean | void {
    let query =
      req.method === 'GET'
        ? (req.query.variables as any)?.initData
        : req.body.variables?.initData;

    query = queryString.parse(query);

    if (!query.auth_date || !query.hash || !query.id) {
      return this.fail({ message: 'Missing some important data' }, 400);
    }

    const authDate = Math.floor(Number(query.auth_date));
    if (
      this.options.queryExpiration !== -1 &&
      (Number.isNaN(authDate) ||
        this.getTimestamp() - authDate > this.options.queryExpiration)
    ) {
      return this.fail({ message: 'Data is outdated' }, 400);
    }

    const hash = crypto
      .createHmac('sha256', this.getBotToken())
      .update(transformPayload(query))
      .digest('hex');

    if (hash !== query.hash) {
      return this.fail({ message: 'Hash validation failed' }, 403);
    }

    return true;
  }
}
