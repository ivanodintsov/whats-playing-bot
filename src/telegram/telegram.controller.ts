import {
  Controller,
  Get,
  Inject,
  Query,
  Redirect,
  Request,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { TelegramService } from './telegram.service';
import { TokenExpiredException } from './errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { SENDER_SERVICE } from 'src/bot-core/constants';
import { Sender } from 'src/bot-core/sender.service';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { SpotifyCallbackDto } from 'src/music-services/spotify-service/spotify-callback.dto';

@Controller('telegram')
@UseFilters(new HttpExceptionFilter())
export class TelegramController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly musicServices: MusicServicesService,
    private readonly appConfig: ConfigService,
    private readonly telegramService: TelegramService,

    @Inject(SENDER_SERVICE)
    private readonly sender: Sender,
  ) {}

  @Get('bot')
  @SetCookies()
  @Redirect('/backend/spotify/login/request/telegram')
  async botLogin(@Request() req, @Query('t') t: string) {
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
          maxAge: 60000,
        },
      },
    ];
  }

  @Get('spotify')
  @Redirect()
  async loginTelegram(
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    const payload = await this.verifyToken(cookies.t);

    await this.musicServices.createAndSaveTokens({
      query,
      user: { tg_id: parseInt(payload.id, 10) },
      redirectUri: this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    });

    await this.sender.sendConnectedSuccessfully(payload.id);
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
