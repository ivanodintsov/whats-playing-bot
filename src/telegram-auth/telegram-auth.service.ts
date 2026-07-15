import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuthService } from 'src/auth/auth.service';
import { AutherizedContext } from 'src/auth/types';
import { UserNotExistsError } from 'src/bot-core/errors';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { User } from 'src/users/models/user.model';

const transformPayload = (payload: any) => {
  return Object.keys(payload)
    .map((key) => `${key}=${payload[key]}`)
    .sort()
    .join('\n');
};

@Injectable()
export class TelegramAuthService {
  constructor(
    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,

    private readonly authService: AuthService,
  ) {
    const q = '';
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

  async getUser({ tgId }: { tgId: string }): Promise<AutherizedContext> {
    const user = await this.telegramUserModel.findOne({
      where: {
        tg_id: `${tgId}`,
      },
      include: [
        {
          model: User,
        },
      ],
    });

    if (!user) {
      throw new UserNotExistsError();
    }

    const loginData = await this.authService.login(user.user);

    return {
      user: user.user,
      provider: 'telegram',
      ...loginData,
    };
  }
}
