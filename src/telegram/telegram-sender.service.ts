import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectModuleBot } from './decorators/inject-bot';
import { MESSAGES_SERVICE } from './domain/constants';
import { Message } from './domain/message/message';
import { MessagesService } from './domain/messages.service';
import { Sender, TSenderMessage } from './domain/sender.service';

interface TTelegramSenderMessage extends TSenderMessage {
  parseMode?: 'Markdown';
}

@Injectable()
export class TelegramSender extends Sender {
  constructor(
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly appConfig: ConfigService,

    @Inject(MESSAGES_SERVICE)
    private readonly messagesService: MessagesService,
  ) {
    super();
  }

  async sendMessage(message: TTelegramSenderMessage) {
    const extra: ExtraReplyMessage = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: message.buttons,
      };
    }

    extra.parse_mode = message.parseMode;

    return this.bot.telegram.sendMessage(message.chatId, message.text, extra);
  }

  async sendSignUpMessage(message: Message, token: string) {
    const { chat } = message;
    const messageContent = this.messagesService.getSignUpMessage(message);

    await this.sendMessage({
      chatId: chat.id,
      text: messageContent.text,
      buttons: [[this.messagesService.getSpotifySignUpButton(message, token)]],
    });
  }

  async sendUserExistsMessage(message: Message) {
    const { chat } = message;
    const messageContent = this.messagesService.getSpotifyAlreadyConnectedMessage(
      message,
    );

    await this.sendMessage({
      chatId: chat.id,
      ...messageContent,
    });
  }

  async sendPrivateOnlyMessage({ chat }: Message) {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    await this.sendMessage({
      chatId: chat.id,
      text: `The command for [private messages](${url}) only`,
      parseMode: 'Markdown',
    });
  }
}
