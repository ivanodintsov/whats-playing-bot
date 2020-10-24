import { Controller, Get, Query, Redirect, Request, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramService } from './telegram.service';
import { TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';

@Controller('telegram')
@UseFilters(new HttpExceptionFilter())
export class TelegramController {
  constructor (
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get('bot')
  @SetCookies()
  @Redirect('/spotify/login/request/telegram')
  async botLogin (
    @Request() req,
    @Query('t') t: string,
  ) {
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
          expires: new Date(),
          maxAge: 60000
        },
      },
    ];
  }

  @Get('spotify')
  @Redirect()
  async loginTelegram (
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    const payload = await this.verifyToken(cookies.t);
    const tokens = await this.spotifyService.createAndSaveTokens(
      query,
      this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );
    await this.spotifyService.saveTokens({
      ...tokens,
      tg_id: payload.id,
    })
    this.telegramService.spotifySuccess(payload);
    return {
      url: `https://t.me/${this.appConfig.get<string>('TELEGRAM_BOT_NAME')}`,
    };
  }

  signUp() {
    
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
