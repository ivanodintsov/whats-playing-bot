import { Controller, Get, Query, Redirect, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';
import { SpotifyService } from 'src/spotify/spotify.service';

@Controller('telegram')
export class TelegramController {
  constructor (
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
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
          sameSite: true,
          httpOnly: true,
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
    const tokens = await this.spotifyService.createAndSaveTokens(query, 'https://2342b4f58f6d.ngrok.io/telegram/spotify');
    await this.spotifyService.saveTokens({
      ...tokens,
      tg_id: user.id,
    })
    return 'OK';
  }

  signUp() {
    
  }
}
