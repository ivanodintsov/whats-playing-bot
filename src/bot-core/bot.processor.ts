import { OnQueueFailed, Process, InjectQueue, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { Message, MESSENGER_TYPES } from 'src/bot-core/message/message';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_QUEUE } from 'src/bot-core/constants';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import {
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
} from '../telegram/constants';

export type ShareSongJobData = { message: Message; config: ShareSongConfig };

export type UpdateShareJobData = {
  message: Message;
  messageToUpdate: Message;
  data: ShareSongData;
  config: ShareSongConfig;
};

export type SearchJobData = {
  message: Message;
};

export type PostToChatsJobData = {
  message: Message;
  data: ShareSongData;
};

export type SignUpJobData = {
  message: Message;
};

export type AddSongToQueueJobData = {
  message: Message;
};

export type PlaySongJobData = {
  message: Message;
};

export type PreviousSongActionJobData = {
  message: Message;
};

export type NextSongActionJobData = {
  message: Message;
};

export type ToggleFavoriteJobData = {
  message: Message;
};

export type ShareQueueJobData =
  | ShareSongJobData
  | UpdateShareJobData
  | SearchJobData
  | PostToChatsJobData
  | SignUpJobData
  | PlaySongJobData
  | AddSongToQueueJobData
  | PreviousSongActionJobData
  | NextSongActionJobData
  | ToggleFavoriteJobData;

@Processor(BOT_QUEUE)
export class BotProcessor {
  private readonly logger = new Logger(BotProcessor.name);
  private readonly botServices: Record<string, AbstractBotService>;
  private readonly postToChatBotServices: Record<string, AbstractBotService>;

  constructor(
    @InjectQueue(BOT_QUEUE)
    private readonly botQueue: Queue<ShareQueueJobData>,

    @Inject(MAIN_TELEGRAM_BOT_SERVICE_NAME)
    private telegramMainBotService: AbstractBotService,

    @Inject(SECOND_TELEGRAM_BOT_SERVICE_NAME)
    private telegramSecondBotService: AbstractBotService,
  ) {
    this.botServices = {
      [MESSENGER_TYPES.TELEGRAM]: telegramMainBotService,
      [MESSENGER_TYPES.TELEGRAM_2]: telegramSecondBotService,
    };

    this.postToChatBotServices = {
      [MESSENGER_TYPES.TELEGRAM]: telegramMainBotService,
      [MESSENGER_TYPES.TELEGRAM_2]: telegramMainBotService,
    };
  }

  private getBotService(message: Message) {
    return this.botServices[message.messengerType];
  }

  private getPostToChatBotService(message: Message) {
    return this.postToChatBotServices[message.messengerType];
  }

  @Process({
    name: 'shareSong',
    concurrency: 20,
  })
  private async shareSong(job: Job<ShareSongJobData>) {
    const botService = this.getBotService(job.data.message);

    await botService.processShare(job.data.message, job.data.config);
  }

  @Process({
    name: 'updateShare',
    concurrency: 20,
  })
  private async updateShare(job: Job<UpdateShareJobData>) {
    const botService = this.getBotService(job.data.message);

    await botService.processUpdateShare(
      job.data.message,
      job.data.messageToUpdate,
      job.data.data,
      job.data.config,
    );

    try {
      await this.botQueue.add(
        'postToChat',
        {
          message: job.data.message,
          data: job.data.data,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Process({
    name: 'postToChat',
    concurrency: 20,
  })
  private async postToChat(job: Job<PostToChatsJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.sendSongToChats(job.data.message, job.data.data);
  }

  @Process({
    name: 'signUp',
    concurrency: 10,
  })
  private async signUp(job: Job<SignUpJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.signUpProcess(job.data.message);
  }

  @Process({
    name: 'playSong',
    concurrency: 10,
  })
  private async playSong(job: Job<SignUpJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.playSongProcess(job.data.message);
  }

  @Process({
    name: 'addSongToQueue',
    concurrency: 10,
  })
  private async addSongToQueue(job: Job<AddSongToQueueJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.addSongToQueueProcess(job.data.message);
  }

  @Process({
    name: 'previousSongAction',
    concurrency: 10,
  })
  private async previousSongAction(job: Job<PreviousSongActionJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.previousSongActionProcess(job.data.message);
  }

  @Process({
    name: 'nextSongAction',
    concurrency: 10,
  })
  private async nextSongAction(job: Job<NextSongActionJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.nextSongActionProcess(job.data.message);
  }

  @Process({
    name: 'toggleFavorite',
    concurrency: 10,
  })
  private async toggleFavorite(job: Job<ToggleFavoriteJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.toggleFavoriteProcess(job.data.message);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 20,
  })
  private async inlineQuery(job: Job<SearchJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.processSearch(job.data.message);
  }

  @OnQueueFailed()
  private onError(job: Job<ShareQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
