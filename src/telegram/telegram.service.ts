import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action, Hears, On, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import {
  TelegramUser,
  TelegramUserDocument,
} from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { Context } from './types';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { ActionsErrorsHandler } from './actions-errors.handler';
import { Queue } from 'bull';
import { RateLimit } from './rate-limit.guard';
import { Logger } from 'src/logger';
import { TelegramMessagesService } from './telegram-messages.service';
import { InjectModuleQueue } from './decorators';
import { InjectModuleBot } from './decorators/inject-bot';

@Update()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectModel(TelegramUser.name)
    private readonly telegramUserModel: Model<TelegramUserDocument>,
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    @InjectModuleBot() private readonly bot: Telegraf,
    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {}

  @Hears('/start')
  onStart(ctx: Context) {
    this.onStartHandler(ctx);
  }

  @Hears('/start sign_up_pm')
  onStartPm(ctx: Context) {
    this.onStartHandler(ctx);
  }

  @CommandsErrorsHandler()
  private async onStartHandler(ctx: Context) {
    let user;
    const chat = ctx.message.chat;

    if (chat.type !== 'private') {
      throw new Error('PRIVATE_ONLY');
    }

    try {
      const { id, ...restUser } = ctx.message.from;

      user = await this.telegramUserModel.findOne({
        tg_id: id,
      });

      if (!user) {
        user = new this.telegramUserModel({
          ...restUser,
          tg_id: id,
        });
        await user.save();
      }
    } catch (error) {}

    const tokens = await this.spotifyService.getTokens({
      tg_id: user.tg_id,
    });

    if (tokens) {
      ctx.reply(
        'You are already connected to Spotify. Type /share command to the text box below and you will see the magic 💫',
      );
      return;
    }

    const token = await this.jwtService.sign({
      id: user.tg_id,
      chatId: chat.id,
    });

    const site = this.appConfig.get<string>('SITE');
    ctx.reply('Please sign up and let the magic happens 💫', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Sign up with Spotify',
              url: `${site}/telegram/bot?t=${token}`,
            },
          ],
        ],
      },
    });
  }

  @Action(/PLAY_ON_SPOTIFY.*/gi)
  @ActionsErrorsHandler()
  async onPlay(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(
      /PLAY_ON_SPOTIFY(?<spotifyId>.*)$/,
    );
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      await this.spotifyService.playSong({
        uri,
        user: {
          tg_id: ctx.from.id,
        },
      });
      await ctx.answerCbQuery('Yeah 🤟');
    }
  }

  @Action(/ADD_TO_QUEUE_SPOTIFY.*/gi)
  @ActionsErrorsHandler()
  async onAddToQueue(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(
      /ADD_TO_QUEUE_SPOTIFY(?<spotifyId>.*)$/,
    );
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      await this.spotifyService.addToQueue({
        uri,
        user: {
          tg_id: ctx.from.id,
        },
      });
      await ctx.answerCbQuery('Track added to queue 🤟');
    }
  }

  @Action(/PREVIOUS/gi)
  @ActionsErrorsHandler()
  async onPreviousAction(ctx: Context) {
    await this.spotifyService.previousTrack({
      tg_id: ctx.from.id,
    });
    await ctx.answerCbQuery('Yeah 🤟');
  }

  @Action(/NEXT/gi)
  @ActionsErrorsHandler()
  async onNextAction(ctx: Context) {
    await this.spotifyService.nextTrack({
      tg_id: ctx.from.id,
    });
    await ctx.answerCbQuery('Yeah 🤟');
  }

  @Action(/ADD_TO_FAVORITE.*/gi)
  @ActionsErrorsHandler()
  async onFavoriteAction(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(
      /ADD_TO_FAVORITE(?<service>.*):(?<type>.*):(?<spotifyId>.*)$/,
    );
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      const response = await this.spotifyService.toggleFavorite({
        trackIds: [uri],
        user: {
          tg_id: ctx.from.id,
        },
      });

      if (response.action === 'saved') {
        await ctx.answerCbQuery('Added to liked songs ❤️');
      } else if (response.action === 'removed') {
        await ctx.answerCbQuery('Removed from liked songs 💔');
      }
    }
  }

  async getCurrentProfile(ctx: Context) {
    try {
      const { body } = await this.spotifyService.getProfile({
        tg_id: ctx.from.id,
      });
      return body;
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^(\/(share|s)|📣)/gi)
  @RateLimit
  async onShare(ctx: Context) {
    try {
      await this.telegramProcessorQueue.add(
        'shareSong',
        {
          message: ctx.message,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^\/ss/gi)
  @RateLimit
  async onShareSharable(ctx: Context) {
    try {
      await this.telegramProcessorQueue.add(
        'shareSong',
        {
          message: ctx.message,
          config: {
            control: false,
            loading: true,
          },
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^\/me.*/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onMe(ctx: Context) {
    const data = await this.getCurrentProfile(ctx);
    const username = data.display_name || ctx.message.from.first_name;

    await ctx.reply(
      `[${username} Spotify Profile](${R.path(
        ['external_urls', 'spotify'],
        data,
      )})`,
      {
        parse_mode: 'Markdown',
      },
    );
  }

  @Hears(/^▶$/gi)
  @CommandsErrorsHandler()
  async onPlayPause(ctx: Context) {
    await this.spotifyService.togglePlay({
      tg_id: ctx.from.id,
    });
  }

  @Hears(/^(\/next.*|▶▶)/gi)
  @CommandsErrorsHandler()
  async onNext(ctx: Context) {
    await this.spotifyService.nextTrack({
      tg_id: ctx.from.id,
    });
  }

  @Hears(/^(\/previous.*|◀◀)/gi)
  @CommandsErrorsHandler()
  async onPrevious(ctx: Context) {
    await this.spotifyService.previousTrack({
      tg_id: ctx.from.id,
    });
  }

  @On('chosen_inline_result')
  async onChosenInlineResult(ctx: Context) {
    try {
      await this.telegramProcessorQueue.add(
        'chosenInlineResult',
        {
          chosenInlineResult: ctx.chosenInlineResult,
          from: ctx.from,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @On('inline_query')
  async on(ctx: Context) {
    try {
      await this.telegramProcessorQueue.add(
        'inlineQuery',
        {
          message: ctx.inlineQuery,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  async spotifySuccess(payload) {
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
        payload.chatId,
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

      await this.bot.telegram.sendMessage(
        payload.chatId,
        '*Inline features:*',
        {
          parse_mode: 'MarkdownV2',
        },
      );

      for (let i = 0; i < forwards.length; i++) {
        const message = forwards[i];

        await this.bot.telegram.forwardMessage(
          payload.chatId,
          message.chat_id,
          message.message_id,
        );
      }

      await this.bot.telegram.sendMessage(
        payload.chatId,
        'Type /share command to the text box below and you will see the magic 💫',
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^\/history/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onHistory(ctx: Context) {
    const url = `${this.appConfig.get<string>('FRONTEND_URL')}/chats/${
      ctx.chat.id
    }`;
    try {
      await ctx.reply(url);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears('/unlink_spotify')
  @RateLimit
  @CommandsErrorsHandler()
  async onUnlinkSpotify(ctx: Context) {
    const chat = ctx.message.chat;

    if (chat.type !== 'private') {
      throw new Error('PRIVATE_ONLY');
    }

    await this.spotifyService.removeByTgId(`${ctx.message.from.id}`);

    await ctx.reply('Your account has been successfully unlinked', {
      parse_mode: 'Markdown',
    });
  }

  @Hears('/controls')
  @RateLimit
  @CommandsErrorsHandler()
  async onControlsCommand(ctx: Context) {
    await this.bot.telegram.sendMessage(ctx.chat.id, 'Keyboard enabled', {
      // reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        keyboard: [this.telegramMessagesService.createControlButtons()],
        // selective: true,
        resize_keyboard: true,
        input_field_placeholder: 'Control your vibe 🤤',
      },
    });
  }

  @Hears('/disable_controls')
  @RateLimit
  @CommandsErrorsHandler()
  async onDisableControlsCommand(ctx: Context) {
    await this.bot.telegram.sendMessage(ctx.chat.id, 'Keyboard disabled', {
      // reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        remove_keyboard: true,
        // selective: true,
      },
    });
  }

  @Hears(/^\/donate/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onDonate(ctx: Context) {
    const message = this.telegramMessagesService.createDonateMessage();

    try {
      await ctx.reply(message.message, message.extras);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }
}
