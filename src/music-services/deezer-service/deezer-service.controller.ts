import { Controller, Get, Query, Redirect, Request } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { DeezerCallbackDto } from './deezer-callback.dto';
import { DeezerServiceService } from './deezer-service.service';
import { TokenExpiredException } from 'src/telegram/errors';

@Controller('deezer')
export class DeezerServiceController {
  constructor(
    private readonly deezerService: DeezerServiceService,
    private readonly appConfig: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('login/request/telegram')
  @SetCookies()
  @Redirect()
  async loginRequestTelegram(@Request() req, @Query('t') t: string) {
    await this.verifyToken(t);

    const loginUrl = await this.deezerService.createLoginUrl();

    req._cookies = [
      {
        name: 't',
        value: t,
        options: {
          signed: true,
          secure: true,
          sameSite: 'Lax',
          httpOnly: true,
          expires: new Date(),
          maxAge: 60000,
        },
      },
    ];

    return {
      url: loginUrl,
    };
  }

  @Get('telegram')
  @Redirect()
  async loginTelegram(
    @Query() query: DeezerCallbackDto,
    @SignedCookies() cookies,
  ) {
    const payload = await this.verifyToken(cookies.t);

    await this.deezerService.createAndSaveTokens(
      {
        query,
        user: { tg_id: parseInt(payload.id, 10) },
      },
      // this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );

    // await this.sender.sendConnectedSuccessfully(payload.id);

    return {
      url: `https://t.me/${this.appConfig.get<string>('TELEGRAM_BOT_NAME')}`,
    };
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
