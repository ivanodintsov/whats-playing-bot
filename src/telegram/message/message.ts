import { Context } from 'grammy';
import {
  Message,
  MESSENGER_TYPES,
  CHAT_TYPES,
  Chat,
  User,
  MESSAGE_TYPES,
} from 'src/bot-core/message/message';
import { CLIENT_PROVIDES, CLIENT_UNIQUE_PROVIDES } from 'src/constants';

export class TelegramMessage extends Message {
  readonly messengerType: MESSENGER_TYPES = MESSENGER_TYPES.TELEGRAM;
  readonly provider: CLIENT_PROVIDES = CLIENT_PROVIDES.TELEGRAM;
  readonly providerUnique = CLIENT_UNIQUE_PROVIDES.TELEGRAM;
  readonly type: MESSAGE_TYPES = MESSAGE_TYPES.MESSAGE;

  readonly languageCode: string;

  constructor(ctx: Context) {
    super();

    const message = ctx.message;

    this.id = message?.message_id && `${message?.message_id}`;

    if (ctx.chat) {
      this.chat = new Chat();
      this.chat.id = ctx.chat?.id && `${ctx.chat.id}`;

      if (ctx.chat.type === 'private') {
        this.chat.type = CHAT_TYPES.PRIVATE;
      } else if (ctx.chat.type === 'channel') {
        this.chat.type = CHAT_TYPES.CHANNEL;
      } else if (ctx.chat.type === 'group') {
        this.chat.type = CHAT_TYPES.GROUP;
      } else if (ctx.chat.type === 'supergroup') {
        this.chat.type = CHAT_TYPES.SUPEGROUP;
      }

      this.chatType = this.chat.type;
    }

    if (ctx.channelPost || ctx.editedChannelPost) {
      const post = ctx.channelPost || ctx.editedChannelPost;
      this.from = new User();
      this.from.id = post.chat?.id && `${post.chat.id}`;
      this.from.firstName = post.chat?.title;
      this.from.username = post.chat?.username;
    } else {
      this.from = new User();
      this.from.id = ctx.from?.id && `${ctx.from.id}`;
      this.from.firstName = ctx.from?.first_name;
      this.from.lastName = ctx.from?.last_name;
      this.from.username = ctx.from?.username;
      this.from.languageCode = ctx.from?.language_code;
    }

    if (message && 'text' in message) {
      this.text = message.text;
    }

    if (ctx.chosenInlineResult) {
      this.type = MESSAGE_TYPES.ACTION;
      this.id = ctx.chosenInlineResult?.inline_message_id;
      this.text = ctx.chosenInlineResult?.result_id;
    }

    if (ctx.inlineQuery) {
      this.type = MESSAGE_TYPES.SEARCH;
      this.id = ctx.inlineQuery.id;
      this.text = ctx.inlineQuery.query;
      this.offset = ctx.inlineQuery.offset;

      if (ctx.inlineQuery.chat_type === 'private') {
        this.chatType = CHAT_TYPES.PRIVATE;
      } else if (ctx.inlineQuery.chat_type === 'channel') {
        this.chatType = CHAT_TYPES.CHANNEL;
      } else if (ctx.inlineQuery.chat_type === 'group') {
        this.chatType = CHAT_TYPES.GROUP;
      } else if (ctx.inlineQuery.chat_type === 'supergroup') {
        this.chatType = CHAT_TYPES.SUPEGROUP;
      } else if (ctx.inlineQuery.chat_type === 'sender') {
        this.chatType = CHAT_TYPES.PRIVATE;
      }
    }

    if (ctx.callbackQuery) {
      this.text = MESSAGE_TYPES.ACTION;
      this.id = ctx.callbackQuery?.id;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.text = ctx.callbackQuery?.data;
    }
  }

  static fromJSON(data: any) {
    const message = new TelegramMessage(data);
    message.id = data?.message_id;

    return message;
  }
}

export class TelegramBot2Message extends TelegramMessage {
  readonly messengerType = MESSENGER_TYPES.TELEGRAM_2;
  readonly provider: CLIENT_PROVIDES = CLIENT_PROVIDES.TELEGRAM_2;
}
