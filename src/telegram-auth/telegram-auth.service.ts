import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as crypto from 'crypto';
import * as queryString from 'qs';
import { UserNotExistsError } from 'src/bot-core/errors';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';

const transformPayload = (payload: any) => {
  return Object.keys(payload)
    .map(key => `${key}=${payload[key]}`)
    .sort()
    .join('\n');
};

@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly spotifyService: SpotifyService,

    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,
  ) {
    const q =
      '';
    const token = '';
    // this.checkLoginData(q, token);
  }

  // checkLoginData(query: string, botToken: string) {
  //   const payload = queryString.parse(query);
  //   const secret = crypto
  //     .createHmac('sha256', 'WebAppData')
  //     .update(botToken)
  //     .digest();

  //   const hash = payload.hash;
  //   delete payload.hash;

  //   const check = crypto
  //     .createHmac('sha256', secret)
  //     .update(transformPayload(payload))
  //     .digest('hex');

  //   return check === hash;
  // }

  async getUser({ tgId }: { tgId: string }) {
    const user = await this.telegramUserModel.findOne({
      where: {
        tg_id: `${tgId}`,
      },
    });

    if (!user) {
      throw new UserNotExistsError();
    }

    const tokens = await this.spotifyService.updateTokens({
      provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
      userId: user.id,
    });

    return {
      spotifyTokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      },
    };
  }
}
