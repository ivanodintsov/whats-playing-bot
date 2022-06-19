import { JwtService } from '@nestjs/jwt';
import { Action, Hears, On, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

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
import { Inject } from '@nestjs/common';
import { ACTIONS, BOT_SERVICE, SENDER_SERVICE } from './domain/constants';
import { TelegramBotService } from './bot.service';
import { Sender } from './domain/sender.service';

@Update()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    @InjectModuleBot() private readonly bot: Telegraf,
    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
    private readonly telegramMessagesService: TelegramMessagesService,

    @Inject(BOT_SERVICE)
    private readonly botService: TelegramBotService,

    @Inject(SENDER_SERVICE)
    private readonly sender: Sender,
  ) {}

  @Hears('/start')
  @CommandsErrorsHandler()
  async onStart(ctx: Context) {
    await this.botService.singUp(ctx.domainMessage);
  }

  @Hears('/start sign_up_pm')
  @CommandsErrorsHandler()
  async onStartPm(ctx: Context) {
    await this.botService.singUp(ctx.domainMessage);
  }

  @Hears(/^\/ss/gi)
  @RateLimit
  async onShareSharable(ctx: Context) {
    await this.botService.shareSongWithoutControls(ctx.domainMessage);
  }

  @Hears(/^(\/(share|s)|📣)/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onShare(ctx: Context) {
    await this.botService.shareSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.PLAY_ON_SPOTIFY}.*`))
  @ActionsErrorsHandler()
  async onPlay(ctx: Context) {
    await this.botService.playSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.ADD_TO_QUEUE_SPOTIFY}.*`))
  @ActionsErrorsHandler()
  async onAddToQueue(ctx: Context) {
    await this.botService.addSongToQueue(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.PREVIOUS}`))
  @ActionsErrorsHandler()
  async onPreviousAction(ctx: Context) {
    await this.botService.previousSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.NEXT}`))
  @ActionsErrorsHandler()
  async onNextAction(ctx: Context) {
    await this.botService.nextSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.ADD_TO_FAVORITE}.*`))
  @ActionsErrorsHandler()
  async onFavoriteAction(ctx: Context) {
    await this.botService.toggleFavorite(ctx.domainMessage);
  }

  @Hears(/^\/me.*/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onMe(ctx: Context) {
    await this.botService.getProfile(ctx.domainMessage);
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
    await this.botService.processActionMessage(ctx.domainMessage);
  }

  @On('inline_query')
  async on(ctx: Context) {
    try {
      await this.botService.search(ctx.domainMessage);
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
