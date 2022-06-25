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
import { TokenExpiredException } from '../telegram/errors';
import { HttpExceptionFilter } from 'src/helpers/http-exception.filter';
import { SENDER_SERVICE } from 'src/bot-core/constants';
import { Sender } from 'src/bot-core/sender.service';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { SpotifyCallbackDto } from 'src/music-services/spotify-service/spotify-callback.dto';

@Controller('discord')
@UseFilters(new HttpExceptionFilter())
export class DiscordBotController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly musicServices: MusicServicesService,
    private readonly appConfig: ConfigService,

    @Inject(SENDER_SERVICE)
    private readonly sender: Sender,
  ) {}

  @Get('bot')
  @SetCookies()
  @Redirect('/backend/spotify/login/request/discord')
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
  async loginDiscord(
    @Query() query: SpotifyCallbackDto,
    @SignedCookies() cookies,
  ) {
    const payload = await this.verifyToken(cookies.t);

    await this.musicServices.createAndSaveTokens({
      query,
      user: { discord_id: payload.chatId },
      redirectUri: 'http://localhost:3000/backend/discord/spotify',
    });

    await this.sender.sendConnectedSuccessfully(payload.chatId);
    return {
      url: `https://discord.com/channels/@me/${payload.chatId}`,
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
