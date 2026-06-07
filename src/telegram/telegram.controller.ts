import {
  Controller,
  Get,
  Query,
  Redirect,
  Render,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';
import { SomethingWentWrongException, TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { Logger } from 'src/logger';
import { GA4Service } from 'src/utils/ga4/ga4.service';
import { InjectGA4 } from 'src/utils/ga4';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TELEGRAM_QUEUE } from './constants';
import { LoginTelegramJobData } from './telegram.processor';
import { Request, Response } from 'express';

@Controller('telegram')
@UseFilters(new HttpExceptionFilter())
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: ConfigService,

    @InjectGA4()
    private readonly gaService: GA4Service,

    @InjectQueue(TELEGRAM_QUEUE)
    protected readonly queue: Queue,
  ) {}

  @Get('bot')
  @Redirect()
  async botLogin(
    @Req() req,
    @Query('t') t: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    let payload: any;

    try {
      payload = await this.verifyToken(t);

      try {
        await this.gaService.send(
          [
            {
              name: 'connect_bot',
              params: {
                platform: 'telegram',
                engagement_time_msec: '100',
                session_id: payload.id,
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

      const DOMAIN = this.appConfig.get<string>('DOMAIN');

      res.cookie('t', t, {
        domain: `.${DOMAIN}`,
        signed: true,
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 600000,
      });

      return {
        url: `${this.appConfig.get<string>(
          'SITE',
        )}/spotify/login/request/telegram`,
      };
    } catch (error) {
      try {
        await this.gaService.send(
          [
            {
              name: 'connect_bot_failure',
              params: {
                platform: 'telegram',
                engagement_time_msec: '100',
                session_id: payload?.id,
              },
            },
          ],
          {
            non_personalized_ads: true,
          },
        );
      } catch (error) {}
      this.logger.error(error.message, error.stack, error);
      throw error;
    }
  }

  @Get('spotify')
  @Redirect()
  async loginTelegram(@Query() query: SpotifyCallbackDto, @Req() req: Request) {
    let payload: any;
    try {
      payload = await this.verifyToken(req.signedCookies['t']);

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
      try {
        await this.gaService.send(
          [
            {
              name: 'connect_bot_failure',
              params: {
                platform: 'telegram',
                engagement_time_msec: '100',
                session_id: payload?.id,
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
      this.logger.error(error.message, error.stack);
      return {
        url: `${this.appConfig.get<string>('CONNECT_SERVICE_URL')}/telegram/failure`,
      };
    }

    return {
      url: `${this.appConfig.get<string>('CONNECT_SERVICE_URL')}/telegram/success`,
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
