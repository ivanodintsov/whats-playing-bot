import { Context as TelegrafContext } from 'telegraf';
import { TelegramMessage } from './message/message';

export interface Context extends TelegrafContext {
  domainMessage: TelegramMessage;
}
