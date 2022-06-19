import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Telegraf } from 'telegraf';
import { ExtraPhoto, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InlineKeyboardButton } from 'typegram';
import { InjectModuleBot } from './decorators/inject-bot';
import { MESSAGES_SERVICE } from './domain/constants';
import { Message, MESSAGE_TYPES } from './domain/message/message';
import { MessagesService } from './domain/messages.service';
import { Sender, TButton, TSenderMessage } from './domain/sender.service';
import { ShareSongConfig, ShareSongData } from './domain/types';
import { TelegramMessage } from './message/message';

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

  async sendMessage(message: TSenderMessage) {
    const response = await this.bot.telegram.sendMessage(
      message.chatId,
      message.text,
      this.createExtra(message),
    );

    return TelegramMessage.fromJSON(response);
  }

  async sendPhoto(message: TSenderMessage) {
    const extra = this.createExtra(message);

    if (message.text) {
      extra.caption = message.text;
    }

    const response = await this.bot.telegram.sendPhoto(
      message.chatId,
      message.image.url,
      extra,
    );

    return TelegramMessage.fromJSON(response);
  }

  private createExtra(message: TSenderMessage) {
    const extra: ExtraReplyMessage & ExtraPhoto = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: this.buttonsToKeyboard(message.buttons),
      };
    }

    extra.parse_mode = message.parseMode;

    return extra;
  }

  private buttonsToKeyboard(buttons: TButton[][]): InlineKeyboardButton[][] {
    return buttons.map(buttons => {
      return buttons.reduce((acc, button) => {
        let keyboardButton: InlineKeyboardButton;

        if ('url' in button) {
          keyboardButton = {
            text: button.text,
            url: button.url,
          };
        } else if ('callbackData' in button) {
          keyboardButton = {
            text: button.text,
            callback_data: button.callbackData,
          };
        }

        if (keyboardButton) {
          acc.push(keyboardButton);
        }

        return acc;
      }, []);
    });
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

  async sendShare(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ) {
    const messageData = this.messagesService.createCurrentPlaying(
      message,
      data,
      config,
    );

    return await this.sendPhoto({
      chatId: message.chat.id,
      ...messageData,
    });
  }

  async updateShare(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ) {
    const messageData = this.messagesService.createCurrentPlaying(
      message,
      data,
      config,
    );

    const messageId =
      messageToUpdate.type === MESSAGE_TYPES.MESSAGE
        ? messageToUpdate.id
        : null;
    const inlineMessageId =
      messageToUpdate.type === MESSAGE_TYPES.INLINE ? messageToUpdate.id : null;
    const chatId = message.chat?.id;

    await this.bot.telegram.editMessageMedia(
      chatId,
      messageId as number,
      inlineMessageId as string,
      {
        type: 'photo',
        media: messageData.image.url,
        caption: messageData.text,
        parse_mode: messageData.parseMode,
      },
      {
        reply_markup: {
          inline_keyboard: this.buttonsToKeyboard(messageData.buttons),
        },
      },
    );
  }
}
