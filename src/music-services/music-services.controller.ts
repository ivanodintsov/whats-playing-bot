import { Controller, Get, Query, Redirect, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SetCookies, SignedCookies } from '@nestjsplus/cookies';
import { TokenExpiredError } from 'jsonwebtoken';
import { MusicServicesService } from './music-services.service';
import { TokenExpiredException } from 'src/telegram/errors';
import { CallbackDTO } from './callback.dto';
import { MESSENGER_TYPES } from 'src/bot-core/message/message';
import { User } from './music-service-core/music-service-core.service';

@Controller('music-services')
export class MusicServicesController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly musicServices: MusicServicesService,
  ) {}

  @Get('connect')
  @SetCookies()
  @Redirect()
  async connect(@Request() req, @Query('t') t: string) {
    const payload = await this.verifyToken(t);

    const loginUrl = await this.musicServices.services[
      payload.service
    ].createLoginUrl({
      redirectUri: 'http://localhost:3000/backend/music-services/callback',
    });

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

  @Get('callback')
  // @Redirect()
  async loginTelegram(@Query() query: CallbackDTO, @SignedCookies() cookies) {
    const payload = await this.verifyToken(cookies.t);

    let user: User;

    if (
      payload.messenger === MESSENGER_TYPES.TELEGRAM ||
      payload.messenger === MESSENGER_TYPES.TELEGRAM_2
    ) {
      user = { tg_id: parseInt(payload.fromId, 10) };
    } else if (payload.messenger === MESSENGER_TYPES.DISCORD) {
      user = { discord_id: payload.fromId };
    }

    if (!user) {
      throw new Error('NOT_SUPPORTED_MESSENGER');
    }

    const loginUrl = await this.musicServices.services[
      payload.service
    ].createAndSaveTokens({
      query,
      user,
      redirectUri: 'http://localhost:3000/backend/music-services/callback',
    });

    // await this.sender.sendConnectedSuccessfully(payload.id);

    return 'success';
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
