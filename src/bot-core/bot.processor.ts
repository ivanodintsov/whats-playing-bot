import { OnQueueFailed, Process, InjectQueue, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { Message, MESSENGER_TYPES } from 'src/bot-core/message/message';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_QUEUE, BOT_SERVICE } from 'src/bot-core/constants';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { MAIN_BOT, SECOND_BOT } from '../telegram/constants';

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

@Processor(BOT_QUEUE)
export class BotProcessor {
  private readonly logger = new Logger(BotProcessor.name);
  private readonly botServices: Record<string, AbstractBotService>;
  private readonly postToChatBotServices: Record<string, AbstractBotService>;

  constructor(
    @InjectQueue(BOT_QUEUE)
    private readonly botQueue: Queue<ShareQueueJobData>,

    @Inject(`${BOT_SERVICE}_${MAIN_BOT}`)
    private telegramMainBotService: AbstractBotService,

    @Inject(`${BOT_SERVICE}_${SECOND_BOT}`)
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
    concurrency: 2,
  })
  private async shareSong(job: Job<ShareSongJobData>) {
    const botService = this.getBotService(job.data.message);

    await botService.processShare(job.data.message, job.data.config);
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
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
    concurrency: 2,
  })
  private async postToChat(job: Job<PostToChatsJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.sendSongToChats(job.data.message, job.data.data);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 2,
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
