import { OnQueueFailed, Process, InjectQueue, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { MESSENGER_TYPES } from 'src/bot-core/message/message';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_QUEUE } from 'src/bot-core/constants';
import { ConfigService } from '@nestjs/config';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramService } from './telegram.service';
import { SENDER_SERVICE } from 'src/bot-core/constants';
import { Sender } from 'src/bot-core/sender.service';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import {
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
  TELEGRAM_QUEUE,
} from '../telegram/constants';
import { SpotifyCallbackDto } from 'src/spotify/spotify-callback.dto';

export type LoginTelegramJobData = {
  payload: any
  query: SpotifyCallbackDto
};

export type TelegramJobData = LoginTelegramJobData;

@Processor(TELEGRAM_QUEUE)
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);
  // private readonly botServices: Record<string, AbstractBotService>;
  // private readonly postToChatBotServices: Record<string, AbstractBotService>;

  constructor(

    @Inject(MAIN_TELEGRAM_BOT_SERVICE_NAME)
    private telegramMainBotService: AbstractBotService,

    // @Inject(SECOND_TELEGRAM_BOT_SERVICE_NAME)
    // private telegramSecondBotService: AbstractBotService,

    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,

    // @Inject(SENDER_SERVICE)
    // private readonly sender: Sender,
  ) {
    // this.botServices = {
    //   [MESSENGER_TYPES.TELEGRAM]: telegramMainBotService,
    //   [MESSENGER_TYPES.TELEGRAM_2]: telegramSecondBotService,
    // };

    // this.postToChatBotServices = {
    //   [MESSENGER_TYPES.TELEGRAM]: telegramMainBotService,
    //   [MESSENGER_TYPES.TELEGRAM_2]: telegramMainBotService,
    // };
  }

  @Process({
    name: 'loginTelegram',
    concurrency: 5,
  })
  private async loginTelegram(job: Job<LoginTelegramJobData>) {
    const { query, payload } = job.data;

    const tokens = await this.spotifyService.createAndSaveTokens(
      query,
      this.appConfig.get<string>('TELEGRAM_SPOTIFY_CALLBACK_URI'),
    );
    await this.spotifyService.saveTokens({
      ...tokens,
      userId: payload.userId,
      provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
    });
    await this.telegramMainBotService.sender.sendConnectedSuccessfully(payload.id);
  }

  @OnQueueFailed()
  private onError(job: Job<TelegramJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
