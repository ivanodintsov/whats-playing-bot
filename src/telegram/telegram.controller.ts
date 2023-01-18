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

    req._cookies = [
      {
        name: 't',
        value: t,
        options: {
          signed: true,
          secure: true,
          sameSite: 'Lax',
          httpOnly: true,
          maxAge: 600000,
        },
      },
    ];

    return {
      url: '/backend/spotify/login/request/telegram',
    };
  }

  @Get('spotify')
  @Redirect()
  async loginTelegram(
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    const payload = await this.verifyToken(cookies.t);

    try {
      const tokens = await this.spotifyService.createAndSaveTokens(
        query,
        this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
      );
      await this.spotifyService.saveTokens({
        ...tokens,
        userId: payload.userId,
        provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
      });
      await this.sender.sendConnectedSuccessfully(payload.id);
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return {
        url: '/backend/telegram/failure',
      };
    }

    return {
      url: '/backend/telegram/success',
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
