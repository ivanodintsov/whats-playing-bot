import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InjectModuleBot } from './decorators/inject-bot';
import { Message } from './domain/message/message';
import { Sender, TSenderMessage } from './domain/sender.service';

@Injectable()
export class TelegramSender extends Sender {
  constructor(
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly appConfig: ConfigService,
  ) {
    super();
  }

  async sendMessage(message: TSenderMessage) {
    const extra: ExtraReplyMessage = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: message.buttons,
      };
    }

    return this.bot.telegram.sendMessage(message.chatId, message.text, extra);
  }

  async sendSignUpMessage(message: Message, token: string) {
    const { chat } = message;

    const site = this.appConfig.get<string>('SITE');

    await this.sendMessage({
      chatId: chat.id,
      text: 'Please sign up and let the magic happens 💫',
      buttons: [
        [
          {
            text: 'Sign up with Spotify',
            url: `${site}/telegram/bot?t=${token}`,
          },
        ],
      ],
    });
  }

  async sendUserExistsMessage({ chat }: Message) {
    await this.sendMessage({
      chatId: chat.id,
      text:
        'You are already connected to Spotify. Type /share command to the text box below and you will see the magic 💫',
    });
  }
}
