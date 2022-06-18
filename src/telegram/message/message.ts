import { Context } from 'telegraf';
import {
  Message,
  MESSENGER_TYPES,
  CHAT_TYPES,
  Chat,
  User,
} from '../domain/message/message';

export class TelegramMessage extends Message {
  messengerType: MESSENGER_TYPES.TELEGRAM;

  constructor(ctx: Context) {
    super();

    this.id = ctx.message.message_id;

    this.chat = new Chat();
    this.chat.id = ctx.message.chat.id;
    this.chat.type = CHAT_TYPES[ctx.message.chat.type];

    this.from = new User();
    this.from.id = ctx.message.from.id;
    this.from.firstName = ctx.message.from.first_name;
    this.from.lastName = ctx.message.from.last_name;
    this.from.username = ctx.message.from.username;

    if (ctx.message && 'text' in ctx.message) {
      this.text = ctx.message.text;
    }
  }
}
