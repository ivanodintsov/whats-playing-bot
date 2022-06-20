import { Action, Hears, On, Update } from 'nestjs-telegraf';
import { Context } from './types';
import { RateLimit } from './rate-limit.guard';
import { Inject } from '@nestjs/common';
import { ACTIONS, BOT_SERVICE } from 'src/bot-core/constants';
import { TelegramBotService } from './bot.service';

@Update()
export class TelegramService {
  constructor(
    @Inject(BOT_SERVICE)
    private readonly botService: TelegramBotService,
  ) {}

  @Hears('/start')
  async onStart(ctx: Context) {
    await this.botService.singUp(ctx.domainMessage);
  }

  @Hears('/start sign_up_pm')
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
  async onShare(ctx: Context) {
    await this.botService.shareSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.PLAY_ON_SPOTIFY}.*`))
  async onPlay(ctx: Context) {
    await this.botService.playSong(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.ADD_TO_QUEUE_SPOTIFY}.*`))
  async onAddToQueue(ctx: Context) {
    await this.botService.addSongToQueue(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.PREVIOUS}`))
  async onPreviousAction(ctx: Context) {
    await this.botService.previousSongAction(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.NEXT}`))
  async onNextAction(ctx: Context) {
    await this.botService.nextSongAction(ctx.domainMessage);
  }

  @Action(new RegExp(`${ACTIONS.ADD_TO_FAVORITE}.*`))
  async onFavoriteAction(ctx: Context) {
    await this.botService.toggleFavorite(ctx.domainMessage);
  }

  @Hears(/^\/me.*/gi)
  @RateLimit
  async onMe(ctx: Context) {
    await this.botService.getProfile(ctx.domainMessage);
  }

  @Hears(ACTIONS.TOGGLE_PLAY)
  async onPlayPause(ctx: Context) {
    await this.botService.togglePlay(ctx.domainMessage);
  }

  @Hears([/^\/next.*/gi, ACTIONS.NEXT_2])
  async onNext(ctx: Context) {
    await this.botService.nextSong(ctx.domainMessage);
  }

  @Hears([/^\/previous.*/gi, ACTIONS.PREVIOUS_2])
  async onPrevious(ctx: Context) {
    await this.botService.previousSong(ctx.domainMessage);
  }

  @On('chosen_inline_result')
  async onChosenInlineResult(ctx: Context) {
    await this.botService.processActionMessage(ctx.domainMessage);
  }

  @On('inline_query')
  async on(ctx: Context) {
    await this.botService.search(ctx.domainMessage);
  }

  @Hears(/^\/history/gi)
  @RateLimit
  async onHistory(ctx: Context) {
    await this.botService.history(ctx.domainMessage);
  }

  @Hears(/^\/unlink_spotify/gi)
  @RateLimit
  async onUnlinkSpotify(ctx: Context) {
    await this.botService.unlinkService(ctx.domainMessage);
  }

  @Hears(/^\/controls/gi)
  @RateLimit
  async onControlsCommand(ctx: Context) {
    await this.botService.enableKeyboard(ctx.domainMessage);
  }

  @Hears(/^\/disable_controls/gi)
  @RateLimit
  async onDisableControlsCommand(ctx: Context) {
    await this.botService.disableKeyboard(ctx.domainMessage);
  }

  @Hears(/^\/donate/gi)
  @RateLimit
  async onDonate(ctx: Context) {
    await this.botService.donate(ctx.domainMessage);
  }
}
