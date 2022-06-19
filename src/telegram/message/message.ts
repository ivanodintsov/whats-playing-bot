import { Context } from 'telegraf';
import {
  Message,
  MESSENGER_TYPES,
  CHAT_TYPES,
  Chat,
  User,
} from '../domain/message/message';

export class TelegramMessage extends Message {
  readonly messengerType = MESSENGER_TYPES.TELEGRAM;

  readonly type: 'message' | 'callbackQuery' = 'message';

  constructor(ctx: Context) {
    super();

    const message = ctx.message;

    this.id = message?.message_id;

    this.chat = new Chat();
    this.chat.id = ctx.chat.id;
    this.chat.type = CHAT_TYPES[ctx.chat.type];

    this.from = new User();
    this.from.id = ctx.from.id;
    this.from.firstName = ctx.from.first_name;
    this.from.lastName = ctx.from.last_name;
    this.from.username = ctx.from.username;

    if (message && 'text' in message) {
      this.text = message.text;
    }
  }

  static fromJSON(data: any) {
    const message = new TelegramMessage(data);
    message.id = data?.message_id;

    return message;
  }
}
