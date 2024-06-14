import {
  Controller,
  Get,
  Inject,
  Query,
  Redirect,
  Render,
  Request,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramService } from './telegram.service';
import { SomethingWentWrongException, TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { SENDER_SERVICE } from 'src/bot-core/constants';
import { Sender } from 'src/bot-core/sender.service';
import { Logger } from 'src/logger';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { GA4Service } from 'src/utils/ga4/ga4.service';
import { InjectGA4 } from 'src/utils/ga4';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TELEGRAM_QUEUE } from './constants';
import { LoginTelegramJobData } from './telegram.processor';

@Controller('telegram')
@UseFilters(new HttpExceptionFilter())
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    private readonly telegramService: TelegramService,

    @Inject(SENDER_SERVICE)
    private readonly sender: Sender,

    @InjectGA4()
    private readonly gaService: GA4Service,
    
    @InjectQueue(TELEGRAM_QUEUE)
    protected readonly queue: Queue,
  ) {}

  @Get('bot')
  @SetCookies()
  @Redirect()
  async botLogin(@Request() req, @Query('t') t: string) {
    try {
      this.gaService.send(
        [
          {
            name: 'connect_bot',
            params: {
              platform: 'telegram',
              engagement_time_msec: '100',
              session_id: '123',
            },
          },
        ],
        {
          non_personalized_ads: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error.stack, 'ga4');
    }

    await this.verifyToken(t);

    const DOMAIN = this.appConfig.get<string>('DOMAIN');

    req._cookies = [
      {
        name: 't',
        value: t,
        options: {
          domain: `.${DOMAIN}`,
          signed: true,
          secure: true,
          sameSite: 'Lax',
          httpOnly: true,
          maxAge: 600000,
        },
      },
    ];

    return {
      url: `${this.appConfig.get<string>(
        'SITE',
      )}/spotify/login/request/telegram`,
    };
  }

  @Get('spotify')
  @Redirect()
  async loginTelegram(
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    try {
      const payload = await this.verifyToken(cookies.t);

      const jobData: LoginTelegramJobData = {
        payload,
        query,
      };
  
      await this.queue.add('loginTelegram', jobData, {
        attempts: 5,
        removeOnComplete: true,
        priority: 1,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return {
        url: `${this.appConfig.get<string>('FRONTEND_URL')}/telegram/failure`,
      };
    }

    return {
      url: `${this.appConfig.get<string>('FRONTEND_URL')}/telegram/success`,
    };
  }

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
