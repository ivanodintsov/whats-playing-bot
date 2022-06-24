import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { ConfigService } from '@nestjs/config';
import { SpotifyServiceService } from 'src/music-services/spotify-service/spotify-service.service';

@Controller('spotify')
export class SpotifyServiceController {
  constructor(
    private readonly spotifyService: SpotifyServiceService,
    private readonly appConfig: ConfigService,
  ) {}

  @Get('login')
  @Redirect()
  async login() {
    const loginUrl = await this.spotifyService.createLoginUrl();
    return {
      url: loginUrl,
    };
  }

  @Get('login/request/telegram')
  @Redirect()
  async loginRequestTelegram() {
    const loginUrl = await this.spotifyService.createLoginUrl(
      this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );
    return {
      url: loginUrl,
    };
  }

  @Get('login/request/discord')
  @Redirect()
  async loginRequestDiscord() {
    const loginUrl = await this.spotifyService.createLoginUrl(
      'http://localhost:3000/backend/discord/spotify',
    );
    return {
      url: loginUrl,
    };
  }
}
