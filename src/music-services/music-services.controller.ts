import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { Logger } from 'src/logger.service';
import { TokenExpiredException } from 'src/telegram/errors';
import { InjectGA4 } from 'src/utils/ga4';
import { GA4Service } from 'src/utils/ga4/ga4.service';
import { Request, Response } from 'express';
import { MusicServicesService } from './music-services.service';
import { InjectQueue } from '@nestjs/bull';
import { MUSIC_SERVICE_QUEUE } from './music-service-core/constants';
import { Queue } from 'bull';
import { MusicServiceCallbackData } from './music-service-core/music-service.processor';

@Controller('music-services')
@UseFilters(new HttpExceptionFilter())
export class MusicServicesController {
  private readonly logger = new Logger(MusicServicesController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly musicServices: MusicServicesService,
    private readonly appConfig: ConfigService,
    @InjectGA4()
    private readonly gaService: GA4Service,
    @InjectQueue(MUSIC_SERVICE_QUEUE)
    protected readonly queue: Queue,
  ) {}

  @Get('connect')
  @Redirect()
  async botLogin(
    @Req() req,
    @Query('t') t: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    let payload: any;

    try {
      payload = await this.verifyToken(t);

      this.gaService.send(
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

      const loginUrl = await this.musicServices.services[
        payload.service
      ].createLoginUrl(
        this.appConfig.get<string>('CONNECT_MUSIC_SERVICE_CALLNACK_URL'),
      );

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
        url: loginUrl,
      };
    } catch (error) {
      this.gaService.send(
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

      this.logger.error(error.message, error.stack, error);
      throw error;
    }
  }

  @Get('callback')
  @Redirect()
  async callback(@Query() query: any, @Req() req: Request) {
    let payload: any;
    try {
      payload = await this.verifyToken(req.signedCookies['t']);

      const jobData: MusicServiceCallbackData = {
        payload,
        query,
      };

      await this.queue.add('music-service-callback', jobData, {
        attempts: 5,
        removeOnComplete: true,
        priority: 1,
      });
    } catch (error) {
      this.gaService.send(
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

      this.logger.error(error.message, error.stack);
      return {
        url: `${this.appConfig.get<string>('CONNECT_SERVICE_URL')}/telegram/failure`,
      };
    }

    return {
      url: `${this.appConfig.get<string>('CONNECT_SERVICE_URL')}/telegram/success`,
    };
  }

  private async verifyToken(t) {
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
