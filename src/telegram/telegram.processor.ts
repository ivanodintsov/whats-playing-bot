import { OnQueueFailed, Process } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { Message } from 'src/bot-core/message/message';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_SERVICE } from 'src/bot-core/constants';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { InjectModuleQueue } from './decorators';

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

export type ShareQueueJobData =
  | ShareSongJobData
  | UpdateShareJobData
  | SearchJobData
  | PostToChatsJobData;

export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    @InjectModuleQueue()
    private readonly telegramProcessorQueue: Queue<ShareQueueJobData>,

    @Inject(BOT_SERVICE)
    private readonly botService: AbstractBotService,
  ) {}

  @Process({
    name: 'shareSong',
    concurrency: 2,
  })
  private async shareSong(job: Job<ShareSongJobData>) {
    await this.botService.processShare(job.data.message, job.data.config);
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
  })
  private async updateShare(job: Job<UpdateShareJobData>) {
    await this.botService.processUpdateShare(
      job.data.message,
      job.data.messageToUpdate,
      job.data.data,
      job.data.config,
    );

    try {
      await this.telegramProcessorQueue.add(
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
      this.logger.error(error.message, error);
    }
  }

  @Process({
    name: 'postToChat',
    concurrency: 2,
  })
  private async postToChat(job: Job<PostToChatsJobData>) {
    await this.botService.sendSongToChats(job.data.message, job.data.data);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 2,
  })
  private async inlineQuery(job: Job<SearchJobData>) {
    await this.botService.processSearch(job.data.message);
  }

  @OnQueueFailed()
  private onError(job: Job<ShareQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
