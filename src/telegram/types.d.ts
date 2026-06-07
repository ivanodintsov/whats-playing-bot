import { Context as GrammyContext } from 'grammy';
import { MessageEntity } from '@grammyjs/types/message';
import { TelegramMessage } from './message/message';
import {
  TSenderMessage,
  TSenderMessageContent,
  TSenderSearchMessage,
} from 'src/bot-core/sender.service';

export interface Context extends GrammyContext {
  domainMessage: TelegramMessage;
}

export type Opts = {
  entities?: MessageEntity[];
};

export type TelegramSenderMessageContent = TSenderMessageContent<Opts>;

export type TelegramSenderMessage =
  TSenderMessage<TelegramSenderMessageContent>;

export type TelegramSenderSearchMessage = TSenderSearchMessage<Opts>;
