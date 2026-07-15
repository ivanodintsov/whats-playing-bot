import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLIENT_PROVIDES, CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import {
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
} from '../../telegram/constants';
import { InjectGA4 } from 'src/utils/ga4';
import { GA4Service } from 'src/utils/ga4/ga4.service';
import { MusicServicesService } from '../music-services.service';
import { TelegramCreateConnectUrlOptions } from 'src/bot-core/types';
import { MUSIC_SERVICE_QUEUE } from './constants';

export type MusicServiceCallbackData = {
  payload: TelegramCreateConnectUrlOptions;
  query: any;
  restPayload: any;
};

export type TelegramJobData = MusicServiceCallbackData;

@Processor(MUSIC_SERVICE_QUEUE)
export class MusicServiceProcessor {
  private readonly logger = new Logger(MusicServiceProcessor.name);
  private readonly platformInstances: Record<
    CLIENT_PROVIDES,
    AbstractBotService
  >;
  // private readonly postToChatBotServices: Record<string, AbstractBotService>;

  constructor(
    @Inject(MAIN_TELEGRAM_BOT_SERVICE_NAME)
    private telegramMainBotService: AbstractBotService,
    @Inject(SECOND_TELEGRAM_BOT_SERVICE_NAME)
    private telegramSecondBotService: AbstractBotService,

    @InjectGA4()
    private readonly gaService: GA4Service,
    private readonly musicServices: MusicServicesService,
    private readonly appConfig: ConfigService, // @Inject(SENDER_SERVICE) // private readonly sender: Sender,
  ) {
    this.platformInstances = {
      [CLIENT_PROVIDES.TELEGRAM]: telegramMainBotService,
      [CLIENT_PROVIDES.TELEGRAM_2]: telegramSecondBotService,
    };
  }

  @Process({
    name: 'music-service-callback',
    concurrency: 5,
  })
  private async musicServiceCallback(job: Job<MusicServiceCallbackData>) {
    const { query, payload, restPayload } = job.data;
    const musicService = this.getMusicServiceInstance(payload);
    const platform = this.getPlarformInstance(payload);

    if (!musicService || !platform) {
      return;
    }

    try {
      const obtainTokensDate = new Date();

      if (payload.platform === CLIENT_UNIQUE_PROVIDES.TELEGRAM) {
        await musicService.createAndSaveTokens(query, restPayload, {
          obtainDate: obtainTokensDate,
          userId: payload.userId,
          provider: payload.platform,
        });
        await platform.sender.sendConnectedSuccessfully({
          chatId: payload.id,
          musicServiceName: musicService.serviceName,
          platformInstance: payload.platformInstance,
          platform: payload.platform,
          userId: payload.userId,
          service: payload.service,
        });
      }

      this.gaService.send(
        [
          {
            name: 'connect_bot_success',
            params: {
              platform: 'telegram',
              engagement_time_msec: '100',
              session_id: payload.id,
            },
          },
        ],
        {
          non_personalized_ads: true,
        },
      );
    } catch (error) {
      this.logger.debug(error.name, error.message, error.stack, error);

      throw error;
    }
  }

  private getPlarformInstance(payload: MusicServiceCallbackData['payload']) {
    return this.platformInstances[payload.platformInstance];
  }

  private getMusicServiceInstance(
    payload: MusicServiceCallbackData['payload'],
  ) {
    return this.musicServices.services[payload.service];
  }

  @OnQueueFailed()
  private onError(job: Job<TelegramJobData>, error: any) {
    this.logger.debug(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
