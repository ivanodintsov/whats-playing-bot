import { Controller, Get, Query, Redirect, Request } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';
import { SpotifyService } from 'src/spotify/spotify.service';

@Controller('telegram')
export class TelegramController {
  constructor (
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
  ) {}
  @Get('bot')
  @SetCookies()
  @Redirect('/spotify/login/request/telegram')
  async botLogin (
    @Request() req,
    @Query('t') t: string,
  ) {
    await this.jwtService.verifyAsync(t);

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
  async loginTelegram (
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    const user = await this.jwtService.verifyAsync(cookies.t);
    const tokens = await this.spotifyService.createAndSaveTokens(
      query,
      this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );
    await this.spotifyService.saveTokens({
      ...tokens,
      tg_id: user.id,
    })
    return 'OK';
  }

  signUp() {
    
  }
}
