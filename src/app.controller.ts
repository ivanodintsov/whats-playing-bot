import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { SpotifyCallbackDto } from './spotify-callback.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Get('spotify/login')
  @Redirect()
  async login () {
    const loginUrl = await this.appService.createLoginUrl();
    return {
      url: loginUrl,
    };
  }

  @Get('spotify')
  tokens () {
    const tokens = this.appService.getTokens();
    return tokens;
  }

  @Redirect('/spotify')
  @Get('spotify/callback')
  async loginCallback (@Query() query: SpotifyCallbackDto) {
    const tokens = await this.appService.createAndSaveTokens(query);
    return tokens;
  }
}
