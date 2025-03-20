import { Context as GrammyContext } from 'grammy';
import { TelegramMessage } from './message/message';

export interface Context extends GrammyContext {
  domainMessage: TelegramMessage;
}
