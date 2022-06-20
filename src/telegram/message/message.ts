import { Context } from 'telegraf';
import {
  Message,
  MESSENGER_TYPES,
  CHAT_TYPES,
  Chat,
  User,
  MESSAGE_TYPES,
} from 'src/bot-core/message/message';

export class TelegramMessage extends Message {
  readonly messengerType = MESSENGER_TYPES.TELEGRAM;
  readonly type: MESSAGE_TYPES = MESSAGE_TYPES.MESSAGE;

  constructor(ctx: Context) {
    super();

    const message = ctx.message;

    this.id = message?.message_id;

    if (ctx.chat) {
      this.chat = new Chat();
      this.chat.id = ctx.chat.id;

      if (ctx.chat.type === 'private') {
        this.chat.type = CHAT_TYPES.PRIVATE;
      }
    }

    this.from = new User();
    this.from.id = ctx.from.id;
    this.from.firstName = ctx.from.first_name;
    this.from.lastName = ctx.from.last_name;
    this.from.username = ctx.from.username;

    if (message && 'text' in message) {
      this.text = message.text;
    }

    if (ctx.chosenInlineResult) {
      this.type = MESSAGE_TYPES.ACTION;
      this.id = ctx.chosenInlineResult.inline_message_id;
      this.text = ctx.chosenInlineResult.result_id;
    }

    if (ctx.inlineQuery) {
      this.type = MESSAGE_TYPES.SEARCH;
      this.id = ctx.inlineQuery.id;
      this.text = ctx.inlineQuery.query;
      this.offset = ctx.inlineQuery.offset;
    }

    if (ctx.callbackQuery) {
      this.text = MESSAGE_TYPES.ACTION;
      this.id = ctx.callbackQuery.id;
      this.text = ctx.callbackQuery.data;
    }
  }

  static fromJSON(data: any) {
    const message = new TelegramMessage(data);
    message.id = data?.message_id;

    return message;
  }
}
