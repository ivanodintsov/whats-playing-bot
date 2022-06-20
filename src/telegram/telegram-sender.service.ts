import { Injectable, Inject } from '@nestjs/common';
import { Telegraf, Types } from 'telegraf';
import { ExtraPhoto, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import {
  InlineKeyboardButton,
  InlineQueryResult,
  KeyboardButton,
} from 'typegram';
import { Logger } from 'src/logger';
import { InjectModuleBot } from './decorators';
import { ACTIONS, MESSAGES_SERVICE } from 'src/bot-core/constants';
import { Message, MESSAGE_TYPES } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import {
  SEARCH_ITEM_TYPES,
  Sender,
  TButton,
  TButtonLink,
  TSenderButtonSearchItem,
  TSenderMessage,
  TSenderMessageContent,
  TSenderSearchMessage,
  TSenderSearchOptions,
} from 'src/bot-core/sender.service';
import { TelegramMessage } from './message/message';

@Injectable()
export class TelegramSender extends Sender {
  private readonly logger = new Logger(TelegramSender.name);

  constructor(
    @Inject(MESSAGES_SERVICE)
    protected messagesService: AbstractMessagesService,

    @InjectModuleBot() private readonly bot: Telegraf,
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

  async sendConnectedSuccessfully(chatId: TSenderMessage['chatId']) {
    try {
      const forwards = [
        {
          chat_id: -1001757458861,
          message_id: 3,
        },
        {
          chat_id: -1001757458861,
          message_id: 5,
        },
      ];

      await this.bot.telegram.sendMessage(
        chatId,
        [
          'Spotify connected successfully\\.',
          '',
          '*Available commands:*',
          '/share \\- Share current track',
          '/s \\- Share current track',
          '/ss \\- Share current track without control buttons',
          '/next \\- Next track',
          '/previous \\- Previous track',
          '/me \\- Share profile link',
          '/unlink\\_spotify \\- Unlink',
          '/controls \\- Enable control keyboard',
          '/disable\\_controls \\- Disable control keyboard',
        ].join('\n'),
        { parse_mode: 'MarkdownV2' },
      );

      await this.bot.telegram.sendMessage(chatId, '*Inline features:*', {
        parse_mode: 'MarkdownV2',
      });

      for (let i = 0; i < forwards.length; i++) {
        const message = forwards[i];

        await this.bot.telegram.forwardMessage(
          chatId,
          message.chat_id,
          message.message_id,
        );
      }

      await this.bot.telegram.sendMessage(
        chatId,
        'Type /share command to the text box below and you will see the magic 💫',
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  private createExtra(message: TSenderMessage) {
    const extra: ExtraReplyMessage & ExtraPhoto = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: this.buttonsToInlineKeyboard(message.buttons),
      };
    }

    extra.parse_mode = message.parseMode;

    return extra;
  }

  private buttonsToInlineKeyboard(
    buttons: TButton[][],
  ): InlineKeyboardButton[][] {
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

  private buttonsToKeyboard(buttons: TButton[][]): KeyboardButton[][] {
    return buttons.map(buttons => {
      return buttons.reduce((acc, button) => {
        const keyboardButton: KeyboardButton = {
          text: button.text,
        };

        acc.push(keyboardButton);

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
          inline_keyboard: this.buttonsToInlineKeyboard(message.buttons),
        },
      },
    );
  }

  async sendSearch(
    message: TSenderSearchMessage,
    options?: TSenderSearchOptions,
  ) {
    const results: InlineQueryResult[] = [];

    const extra: Types.ExtraAnswerInlineQuery = {
      cache_time: 0,
      next_offset: options?.nextOffset as string,
    };

    let signUpItem: TSenderButtonSearchItem;

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
            reply_markup: item.message.buttons && {
              inline_keyboard: this.buttonsToInlineKeyboard(
                item.message.buttons,
              ),
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
            title: item.title,
            description: item.description,
            thumb_url: item.image?.url,
            thumb_height: item.image?.height,
            thumb_width: item.image?.width,
            input_message_content: {
              message_text: item.message.text,
              parse_mode: item.message.parseMode,
            },
            reply_markup: item.message.buttons && {
              inline_keyboard: this.buttonsToInlineKeyboard(
                item.message.buttons,
              ),
            },
          });
          break;

        case SEARCH_ITEM_TYPES.BUTTON:
          if (item.action === ACTIONS.SIGN_UP) {
            signUpItem = item;
          }
          break;

        default:
          break;
      }
    });

    if (signUpItem) {
      extra.switch_pm_text = signUpItem.title;
      extra.switch_pm_parameter = 'sign_up_pm';

      await this.bot.telegram.answerInlineQuery(
        message.id as string,
        [],
        extra,
      );
      return;
    }

    await this.bot.telegram.answerInlineQuery(
      message.id as string,
      results,
      extra,
    );
  }

  async answerToAction(message: TSenderMessage) {
    const url = message.buttons?.flat?.()?.find?.(button => 'url' in button) as
      | TButtonLink
      | undefined;

    await this.bot.telegram.answerCbQuery(
      message.chatId as string,
      message.text,
      {
        url: url?.url,
      },
    );
  }

  async enableKeyboard(messageToSend: TSenderMessage, message: Message) {
    await this.bot.telegram.sendMessage(
      messageToSend.chatId,
      messageToSend.text,
      {
        // reply_to_message_id: message.id,
        reply_markup: {
          keyboard: this.buttonsToKeyboard(messageToSend.buttons),
          // selective: true,
          resize_keyboard: true,
          input_field_placeholder: messageToSend.description,
        },
      },
    );
  }

  async disableKeyboard(messageToSend: TSenderMessage, message: Message) {
    await this.bot.telegram.sendMessage(
      messageToSend.chatId,
      messageToSend.text,
      {
        // reply_to_message_id: message.id,
        reply_markup: {
          remove_keyboard: true,
          // selective: true,
        },
      },
    );
  }

  async sendUnlinkService(messageToSend: TSenderMessage) {
    await this.sendMessage(messageToSend);
  }
}
