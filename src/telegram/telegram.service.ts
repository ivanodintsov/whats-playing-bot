import { Action, Hears, On, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { SpotifyService } from 'src/spotify/spotify.service';
import { ConfigService } from '@nestjs/config';
import { Context } from './types';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { ActionsErrorsHandler } from './actions-errors.handler';
import { RateLimit } from './rate-limit.guard';
import { Logger } from 'src/logger';
import { TelegramMessagesService } from './telegram-messages.service';
import { InjectModuleBot } from './decorators/inject-bot';
import { Inject } from '@nestjs/common';
import { ACTIONS, BOT_SERVICE } from './domain/constants';
import { TelegramBotService } from './bot.service';

@Update()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,

    @InjectModuleBot()
    private readonly bot: Telegraf,

    private readonly telegramMessagesService: TelegramMessagesService,

    @Inject(BOT_SERVICE)
    private readonly botService: TelegramBotService,
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

  @Hears([/^\/(share|s)/gi, ACTIONS.SHARE_SONG])
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
    await this.botService.previousSongAction(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.NEXT}`))
  @ActionsErrorsHandler()
  async onNextAction(ctx: Context) {
    await this.botService.nextSongAction(ctx.domainMessage);
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

  @Hears(ACTIONS.TOGGLE_PLAY)
  @CommandsErrorsHandler()
  async onPlayPause(ctx: Context) {
    await this.botService.togglePlay(ctx.domainMessage);
  }

  @Hears([/^\/next.*/gi, ACTIONS.NEXT_2])
  @CommandsErrorsHandler()
  async onNext(ctx: Context) {
    await this.botService.nextSong(ctx.domainMessage);
  }

  @Hears([/^\/previous.*/gi, ACTIONS.PREVIOUS_2])
  @CommandsErrorsHandler()
  async onPrevious(ctx: Context) {
    await this.botService.previousSong(ctx.domainMessage);
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

  @Hears(/^\/unlink_spotify/gi)
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

  @Hears(/^\/controls/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onControlsCommand(ctx: Context) {
    await this.botService.enableKeyboard(ctx.domainMessage);
  }

  @Hears(/^\/disable_controls/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onDisableControlsCommand(ctx: Context) {
    await this.botService.disableKeyboard(ctx.domainMessage);
  }

  @Hears(/^\/donate/gi)
  @RateLimit
  @CommandsErrorsHandler()
  async onDonate(ctx: Context) {
    await this.botService.donate(ctx.domainMessage);
  }
}
