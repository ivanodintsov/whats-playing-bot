import { InjectModel } from '@nestjs/sequelize';
import { AbstractBotUserService } from 'src/bot-core/bot-user.service';
import { Message } from 'src/bot-core/message/message';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { Logger } from 'src/logger.service';
import { SomethingWentWrongException } from './errors';
import { UsersService } from 'src/users/users.service';
import { UserNotExistsError } from 'src/bot-core/errors';

export class TelegramBotUserService extends AbstractBotUserService {
  private readonly logger = new Logger(TelegramBotUserService.name);

  constructor(
    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,

    private readonly usersService: UsersService,
  ) {
    super();
  }

  async createUser(message: Message): Promise<TelegramUser> {
    const { from } = message;

    try {
      const { id, ...restUser } = from;
      let user = await this.telegramUserModel.findOne({
        where: {
          tg_id: id,
        },
      });

      if (!user) {
        const domainUser = await this.usersService.createEmptyUser();
        user = await this.telegramUserModel.create({
          userId: domainUser.id,
          first_name: restUser.firstName,
          last_name: restUser.lastName,
          language_code: restUser.languageCode,
          username: restUser.username,
          tg_id: id,
        });
      }

      return user;
    } catch (error) {
      this.logger.debug(error.message, error.stack, 'createUser');
      throw new SomethingWentWrongException();
    }
  }

  async getUser(message: Pick<Message, 'from'>): Promise<TelegramUser> {
    const user = await this.telegramUserModel.findOne({
      where: {
        tg_id: message.from.id,
      },
    });

    if (!user) {
      throw new UserNotExistsError();
    }

    return user;
  }
}
