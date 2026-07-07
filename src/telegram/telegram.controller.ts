import { Controller, Get, Render, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SomethingWentWrongException, TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { Logger } from 'src/logger';

@Controller('telegram')
@UseFilters(new HttpExceptionFilter())
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: ConfigService,
  ) {}

  @Get('success')
  @Render('connect-bot-success.hbs')
  success() {
    return {
      meta: {
        title: 'Telegram connected successfully',
        themeColor: '#1feb6a',
      },
      layout: 'main',
      openUrl: `https://t.me/${this.appConfig.get<string>(
        'TELEGRAM_BOT_NAME',
      )}`,
      platform: 'telegram',
    };
  }

  @Get('failure')
  failure() {
    throw new SomethingWentWrongException();
  }

  async verifyToken(t) {
    try {
      const payload = await this.jwtService.verifyAsync(t);
      return payload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new TokenExpiredException();
      }

      throw error;
    }
  }
}
