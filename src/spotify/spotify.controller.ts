import { Controller, Get, Query, Redirect, UseGuards } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Cookies, SignedCookies } from '@nestjsplus/cookies';
import { ConfigService } from '@nestjs/config';

@Controller('spotify')
export class SpotifyController {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
  ) {}

  @Get()
  tokens () {
    const tokens = this.spotifyService.getTokens({});
    return tokens;
  }
z

  // @UseGuards(JwtAuthGuard)
  @Get('login')
  @Redirect()
  async login () {
    const loginUrl = await this.spotifyService.createLoginUrl();
    return {
      url: loginUrl,
    };
  }

  @Get('login/request/telegram')
  @Redirect()
  async loginRequestTelegram () {
    const loginUrl = await this.spotifyService.createLoginUrl(
      this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );
    return {
      url: loginUrl,
    };
  }

  // @UseGuards(JwtAuthGuard)
  // @Redirect('/spotify')
  @Get('callback')
  async loginCallback (@Query() query: SpotifyCallbackDto) {
    const tokens = await this.spotifyService.createAndSaveTokens(query);
    return tokens;
  }
}
