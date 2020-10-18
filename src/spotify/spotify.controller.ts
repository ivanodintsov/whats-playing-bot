import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyCallbackDto } from './spotify-callback.dto';

@Controller('spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get()
  tokens () {
    const tokens = this.spotifyService.getTokens();
    return tokens;
  }
z

  @Get('login')
  @Redirect()
  async login () {
    const loginUrl = await this.spotifyService.createLoginUrl();
    return {
      url: loginUrl,
    };
  }

  @Redirect('/spotify')
  @Get('callback')
  async loginCallback (@Query() query: SpotifyCallbackDto) {
    const tokens = await this.spotifyService.createAndSaveTokens(query);
    return tokens;
  }
}
