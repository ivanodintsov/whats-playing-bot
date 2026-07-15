import {
  BadRequestException,
  Controller,
  Get,
  Render,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SomethingWentWrongException, TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { Logger } from 'src/logger';
import { Request, Response } from 'express';
import { MusicServicesConnectedSuccessDataContext } from 'src/music-services/types';
import {
  MUSIC_SERVICE_NAMES_BY_PROVIDERS,
  MusicServiceConfig,
} from 'src/constants';

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
  success(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const successCookie = req.signedCookies['wsps_csd'];

    if (!successCookie) {
      throw new BadRequestException(
        'Please return to Telegram and connect your music service again.',
        {
          cause: new Error(),
          description: 'This page has expired or is no longer valid.',
        },
      );
    }

    const connectedSuccessData: MusicServicesConnectedSuccessDataContext =
      JSON.parse(successCookie);

    const DOMAIN = this.appConfig.get<string>('DOMAIN');
    res.clearCookie('wsps_csd', {
      domain: DOMAIN,
      signed: true,
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 86400000,
    });

    const musicServiceConfig =
      MusicServiceConfig[
        MUSIC_SERVICE_NAMES_BY_PROVIDERS[connectedSuccessData.service]
      ];

    if (!musicServiceConfig) {
      throw new SomethingWentWrongException();
    }

    return {
      meta: {
        title: 'Telegram connected successfully',
        themeColor: musicServiceConfig.color,
      },
      layout: 'main',
      openUrl: `https://t.me/${this.appConfig.get<string>(
        'TELEGRAM_BOT_NAME',
      )}`,
      platform: 'telegram',
      musicServiceName: musicServiceConfig.name,
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
