/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable, Inject } from '@nestjs/common';
import { Bot } from 'grammy';
import { Opts } from 'grammy/types';
import {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  InlineQueryResult,
  InlineQueryResultPhoto,
  KeyboardButton,
  ParseMode,
} from 'grammy/types';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { InjectModuleBot } from './decorators';
import { ACTIONS, BOT_QUEUE, MESSAGES_SERVICE } from 'src/bot-core/constants';
import { Message, MESSAGE_TYPES } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import {
  SEARCH_ITEM_TYPES,
  SendConnectedSuccessfullyOptions,
  Sender,
  TButton,
  TButtonLink,
  TSenderButtonSearchItem,
  TSenderSearchOptions,
} from 'src/bot-core/sender.service';
import { TelegramMessage } from './message/message';
import { SendConnectedSuccessfullyJobData } from 'src/bot-core/bot.processor';
import { TelegramSenderMessage, TelegramSenderSearchMessage } from './types';
import {
  MUSIC_SERVICE_NAMES_BY_PROVIDERS,
  MusicServiceConfig,
} from 'src/constants';

@Injectable()
export class TelegramSender extends Sender {
  private readonly logger = new Logger(TelegramSender.name);

  constructor(
    @Inject(MESSAGES_SERVICE)
    protected messagesService: AbstractMessagesService,

    @InjectModuleBot() private readonly bot: Bot,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,
  ) {
    super();
  }

  async sendMessage(message: TelegramSenderMessage) {
    const response = await this.bot.api.sendMessage(
      message.chatId,
      message.text,
      this.createExtra(message),
    );

    return TelegramMessage.fromJSON(response);
  }

  async editMessage(updateMessage: Message, message: TelegramSenderMessage) {
    const response = await this.bot.api.editMessageText(
      updateMessage.chat.id,
      parseInt(updateMessage.id, 10),
      message.text,
      this.createExtraEditMessage(message),
    );

    return TelegramMessage.fromJSON(response);
  }

  async sendPhoto(message: TelegramSenderMessage) {
    const extra = this.createExtraPhoto(message);

    if (message.text) {
      extra.caption = message.text;
    }

    if (message.entities) {
      extra.caption_entities = message.entities;
    }

    const response = await this.bot.api.sendPhoto(
      message.chatId,
      message.image.url,
      extra,
    );

    return TelegramMessage.fromJSON(response);
  }

  async sendConnectedSuccessfullyProcess({
    chatId,
    service,
  }: SendConnectedSuccessfullyOptions) {
    const serviceConfig =
      MusicServiceConfig[MUSIC_SERVICE_NAMES_BY_PROVIDERS[service]];

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

      await this.bot.api.sendMessage(
        chatId,
        [
          `${serviceConfig.name} connected successfully\\.`,
          '',
          '*Available commands:*',
          '/share \\- Share current track',
          '/s \\- Share current track',
          '/ss \\- Share current track without control buttons',
          '/next \\- Next track _\\(Spotify only\\)_',
          '/previous \\- Previous track _\\(Spotify only\\)_',
          '/me \\- Share profile link',
          '/connect \\- Connect music service',
          '/unlink \\- Unlink',
          '/controls \\- Enable control keyboard',
          '/disable\\_controls \\- Disable control keyboard',
        ].join('\n'),
        { parse_mode: 'MarkdownV2' },
      );

      await this.bot.api.sendMessage(chatId, '*Inline features:*', {
        parse_mode: 'MarkdownV2',
      });

      for (let i = 0; i < forwards.length; i++) {
        const message = forwards[i];

        await this.bot.api.forwardMessage(
          chatId,
          message.chat_id,
          message.message_id,
        );
      }

      await this.bot.api.sendMessage(
        chatId,
        'Type /share command to the text box below and you will see the magic 💫',
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendConnectedSuccessfully(data: SendConnectedSuccessfullyOptions) {
    const jobData: SendConnectedSuccessfullyJobData = {
      chatId: data.chatId,
      platformInstance: data.platformInstance,
      musicServiceName: data.musicServiceName,
      userId: data.userId,
      platform: data.platform,
      service: data.service,
    };

    await this.queue.add('sendConnectedSuccessfully', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  private createExtra(
    message: TelegramSenderMessage,
  ): Omit<Opts<'sendMessage'>, 'chat_id' | 'text'> {
    const extra: Omit<Opts<'sendMessage'>, 'chat_id' | 'text'> = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: this.buttonsToInlineKeyboard(message.buttons),
      };
    }

    if (message.entities) {
      extra.entities = message.entities;
    }

    extra.parse_mode = this.getParseMode(message.parseMode);

    return extra;
  }

  private createExtraPhoto(
    message: TelegramSenderMessage,
  ): Omit<Opts<'sendPhoto'>, 'chat_id' | 'photo'> {
    const extra: Omit<Opts<'sendPhoto'>, 'chat_id' | 'photo'> = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: this.buttonsToInlineKeyboard(message.buttons),
      };
    }

    extra.parse_mode = this.getParseMode(message.parseMode);

    return extra;
  }

  private createExtraEditMessage(
    message: TelegramSenderMessage,
  ): Omit<
    Opts<'editMessageText'>,
    'chat_id' | 'message_id' | 'inline_message_id' | 'text'
  > {
    const extra: Omit<
      Opts<'editMessageText'>,
      'chat_id' | 'message_id' | 'inline_message_id' | 'text'
    > = {};

    if (message.buttons) {
      extra.reply_markup = {
        inline_keyboard: this.buttonsToInlineKeyboard(message.buttons),
      };
    }

    if (message.entities) {
      extra.entities = message.entities;
    }

    extra.parse_mode = this.getParseMode(message.parseMode);

    return extra;
  }

  private getParseMode(
    parseMode: TelegramSenderMessage['parseMode'],
  ): ParseMode {
    return parseMode === 'Markdown' ? 'MarkdownV2' : undefined;
  }

  private buttonsToInlineKeyboard(
    buttons: TButton[][],
  ): InlineKeyboardButton[][] {
    return buttons.map((buttons) => {
      return buttons.reduce((acc, button) => {
        let keyboardButton: InlineKeyboardButton;

        if ('app' in button) {
          keyboardButton = {
            text: button.text,
            web_app: {
              url: button.app.url,
            },
          };
        } else if ('url' in button) {
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
    return buttons.map((buttons) => {
      return buttons.reduce((acc, button) => {
        const keyboardButton: KeyboardButton = button.text;

        acc.push(keyboardButton);

        return acc;
      }, []);
    });
  }

  async sendShare(message: TelegramSenderMessage) {
    return this.sendPhoto(message);
  }

  async updateShare(message: TelegramSenderMessage, messageToUpdate: Message) {
    const messageId =
      messageToUpdate.type === MESSAGE_TYPES.MESSAGE
        ? messageToUpdate.id
        : null;
    const inlineMessageId =
      messageToUpdate.type === MESSAGE_TYPES.ACTION ? messageToUpdate.id : null;
    const chatId = messageToUpdate.chat?.id;
    const extra = this.createExtra(message);

    if (messageId) {
      await this.bot.api.editMessageMedia(
        chatId,
        parseInt(messageId, 10),
        {
          type: 'photo',
          media: message.image.url,
          caption: message.text,
          caption_entities: message.entities,
          parse_mode: extra?.parse_mode,
        },
        {
          reply_markup: {
            inline_keyboard: (extra?.reply_markup as InlineKeyboardMarkup)
              ?.inline_keyboard,
          },
        },
      );
    }

    if (inlineMessageId) {
      await this.bot.api.editMessageMediaInline(
        inlineMessageId,
        {
          type: 'photo',
          media: message.image.url,
          caption: message.text,
          caption_entities: message.entities,
          parse_mode: extra?.parse_mode,
        },
        {
          reply_markup: {
            inline_keyboard: (extra?.reply_markup as InlineKeyboardMarkup)
              ?.inline_keyboard,
          },
        },
      );
    }
  }

  async sendSearch(
    message: TelegramSenderSearchMessage,
    options?: TSenderSearchOptions,
  ) {
    const results: InlineQueryResult[] = [];
    const extra: Omit<
      Opts<'answerInlineQuery'>,
      'inline_query_id' | 'results'
    > = {
      cache_time: 0,
      next_offset: options?.nextOffset as string,
      is_personal: true,
    };

    let signUpItem: TSenderButtonSearchItem;

    message.items.forEach((item) => {
      switch (item.type) {
        case SEARCH_ITEM_TYPES.SONG:
          results.push({
            id: item.action,
            type: 'photo',
            title: item.title,
            thumbnail_url: item.image.url,
            photo_url: item.message.image.url,
            photo_width: item.message.image.width,
            photo_height: item.message.image.height,
            reply_markup: item.message.buttons && {
              inline_keyboard: this.buttonsToInlineKeyboard(
                item.message.buttons,
              ),
            },
            caption: item.message.text,
            caption_entities: item.message.entities,
            parse_mode: this.getParseMode(item.message.parseMode),
            description: item.description,
          });
          break;

        case SEARCH_ITEM_TYPES.TEXT:
          results.push({
            id: item.action,
            type: 'article',
            title: item.title,
            description: item.description,
            thumbnail_url: item.image?.url,
            thumbnail_height: item.image?.height,
            thumbnail_width: item.image?.width,
            input_message_content: {
              message_text: item.message.text,
              parse_mode: this.getParseMode(item.message.parseMode),
              entities: item.message.entities,
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
      extra.button = { text: signUpItem.title, start_parameter: 'sign_up_pm' };

      await this.bot.api.answerInlineQuery(message.id as string, [], extra);
      return;
    }

    await this.bot.api.answerInlineQuery(message.id as string, results, extra);
  }

  async answerToAction(message: TelegramSenderMessage) {
    const url = message.buttons
      ?.flat?.()
      ?.find?.((button) => 'url' in button) as TButtonLink | undefined;

    await this.bot.api.answerCallbackQuery(message.chatId as string, {
      text: message.text,
      url: url?.url,
    });
  }

  async enableKeyboard(messageToSend: TelegramSenderMessage, message: Message) {
    await this.bot.api.sendMessage(messageToSend.chatId, messageToSend.text, {
      // reply_to_message_id: message.id,
      reply_markup: {
        keyboard: this.buttonsToKeyboard(messageToSend.buttons),
        // selective: true,
        resize_keyboard: true,
        input_field_placeholder: messageToSend.description,
      },
    });
  }

  async disableKeyboard(
    messageToSend: TelegramSenderMessage,
    message: Message,
  ) {
    await this.bot.api.sendMessage(messageToSend.chatId, messageToSend.text, {
      // reply_to_message_id: message.id,
      reply_markup: {
        remove_keyboard: true,
        // selective: true,
      },
    });
  }

  async sendUnlinkService(messageToSend: TelegramSenderMessage) {
    await this.sendMessage(messageToSend);
  }

  async savePreparedInlineMessage(
    userId: Message['from']['id'],
    item: TelegramSenderSearchMessage['items'][0],
  ) {
    if (item.type === SEARCH_ITEM_TYPES.SONG) {
      const tgQueryResult: InlineQueryResultPhoto = {
        id: item.action,
        type: 'photo',
        title: item.title,
        thumbnail_url: item.image.url,
        photo_url: item.message.image.url,
        photo_width: item.message.image.width,
        photo_height: item.message.image.height,
        reply_markup: item.message.buttons && {
          inline_keyboard: this.buttonsToInlineKeyboard(item.message.buttons),
        },
        caption: item.message.text,
        caption_entities: item.message.entities,
        parse_mode: this.getParseMode(item.message.parseMode),
        description: item.description,
      };

      return this.bot.api.savePreparedInlineMessage(
        parseInt(userId, 10),
        tgQueryResult,
        {
          allow_bot_chats: false,
          allow_channel_chats: true,
          allow_group_chats: true,
          allow_user_chats: true,
        },
      );
    }
  }
}
