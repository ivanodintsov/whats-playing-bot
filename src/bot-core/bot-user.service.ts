import { Message } from './message/message';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';

export abstract class AbstractBotUserService {
  abstract createUser(message: Message): Promise<TelegramUser>;
  abstract getUser(message: Pick<Message, 'from'>): Promise<TelegramUser>;
}
