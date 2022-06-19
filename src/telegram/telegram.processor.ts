import { OnQueueFailed, Process } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { CommandsService } from './commands.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { Logger } from 'src/logger';
import { InlineService } from './inline/inline.service';
import { Message } from './domain/message/message';
import { AbstractBotService } from './domain/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_SERVICE } from './domain/constants';
import { ShareSongConfig, ShareSongData } from './domain/types';
import { InjectModuleQueue } from './decorators';

export type ShareSongJobData = { message: Message; config: ShareSongConfig };

export type UpdateShareJobData = {
  message: Message;
  messageToUpdate: Message;
  data: ShareSongData;
  config: ShareSongConfig;
};

export type ShareQueueJobData = ShareSongJobData | UpdateShareJobData;

export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    private readonly commandsService: CommandsService,
    private readonly channelPostingService: ChannelPostingService,

    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
    private readonly inlineService: InlineService,

    @Inject(BOT_SERVICE)
    private readonly botService: AbstractBotService,
  ) {}

  @Process({
    name: 'shareSong',
    concurrency: 2,
  })
  private async shareSong(job: Job<ShareSongJobData>) {
    this.botService.processShare(job.data.message, job.data.config);
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
          from: job.data.message.from,
          track: job.data.data.track,
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
  private async postToChat(job: Job) {
    await this.channelPostingService.sendSong(job.data);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 2,
  })
  private async inlineQuery(job: Job) {
    await this.inlineService.process(job.data.message);
  }

  @Process({
    name: 'updateSearch',
    concurrency: 2,
  })
  private async updateSearch(job: Job) {
    await this.commandsService.updateSearch(
      job.data.message,
      job.data.from,
      job.data.track,
      job.data.config,
    );

    try {
      await this.telegramProcessorQueue.add(
        'postToChat',
        {
          from: job.data.from,
          track: job.data.track,
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

  @OnQueueFailed()
  private onError(job: Job<ShareQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
