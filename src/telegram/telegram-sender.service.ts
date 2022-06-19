import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Telegraf, Types } from 'telegraf';
import { ExtraPhoto, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { InlineKeyboardButton, InlineQueryResult } from 'typegram';
import { InjectModuleBot } from './decorators/inject-bot';
import { MESSAGES_SERVICE } from './domain/constants';
import { Message, MESSAGE_TYPES } from './domain/message/message';
import { AbstractMessagesService } from './domain/messages.service';
import {
  SEARCH_ITEM_TYPES,
  Sender,
  TButton,
  TSenderMessage,
  TSenderMessageContent,
  TSenderSearchMessage,
  TSenderSearchOptions,
} from './domain/sender.service';
import { ShareSongConfig, ShareSongData } from './domain/types';
import { TelegramMessage } from './message/message';

@Injectable()
export class TelegramSender extends Sender {
  constructor(
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly appConfig: ConfigService,

    @Inject(MESSAGES_SERVICE)
    private readonly messagesService: AbstractMessagesService,
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

  async sendShare(message: TSenderMessage) {
    return this.sendPhoto(message);
  }

  async updateShare(message: TSenderMessageContent, messageToUpdate: Message) {
    const messageId =
      messageToUpdate.type === MESSAGE_TYPES.MESSAGE
        ? messageToUpdate.id
        : null;
    const inlineMessageId =
      messageToUpdate.type === MESSAGE_TYPES.ACTION ? messageToUpdate.id : null;
    const chatId = messageToUpdate.chat?.id;

    await this.bot.telegram.editMessageMedia(
      chatId,
      messageId as number,
      inlineMessageId as string,
      {
        type: 'photo',
        media: message.image.url,
        caption: message.text,
        parse_mode: message.parseMode,
      },
      {
        reply_markup: {
          inline_keyboard: this.buttonsToKeyboard(message.buttons),
        },
      },
    );
  }

  async sendSearch(
    message: TSenderSearchMessage,
    options?: TSenderSearchOptions,
  ) {
    try {
      const results: InlineQueryResult[] = [];

      const extra: Types.ExtraAnswerInlineQuery = {
        cache_time: 0,
        next_offset: options?.nextOffset as string,
      };

      message.items.forEach(item => {
        switch (item.type) {
          case SEARCH_ITEM_TYPES.SONG:
            results.push({
              id: item.action,
              type: 'photo',
              title: item.title,
              thumb_url: item.image.url,
              photo_url: item.message.image.url,
              photo_width: item.message.image.width,
              photo_height: item.message.image.height,
              reply_markup: {
                inline_keyboard: this.buttonsToKeyboard(item.message.buttons),
              },
              caption: item.message.text,
              parse_mode: item.message.parseMode,
              description: item.description,
            });
            break;

          case SEARCH_ITEM_TYPES.TEXT:
            results.push({
              id: item.action,
              type: 'article',
              title: 'Donate',
              description: item.message.text,
              thumb_url: item.image?.url,
              thumb_height: item.image?.height,
              thumb_width: item.image?.width,
              input_message_content: {
                message_text: item.message.text,
                parse_mode: item.message.parseMode,
              },
              reply_markup: {
                inline_keyboard: this.buttonsToKeyboard(item.message.buttons),
              },
            });
            break;

          default:
            break;
        }
      });

      await this.bot.telegram.answerInlineQuery(
        message.id as string,
        results,
        extra,
      );
    } catch (error) {
      throw {
        error,
        message,
      };
    }
  }

  async answerToAction(message: TSenderMessage) {
    await this.bot.telegram.answerCbQuery(
      message.chatId as string,
      message.text,
    );
  }
}
