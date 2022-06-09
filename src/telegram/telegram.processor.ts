import { Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CommandsService } from './commands.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { InlineService } from './inline/inline.service';
import { InjectModuleQueue } from './decorators';

export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    private readonly commandsService: CommandsService,
    private readonly channelPostingService: ChannelPostingService,
    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
    private readonly inlineService: InlineService,
  ) {}

  @Process({
    name: 'shareSong',
    concurrency: 2,
  })
  private async shareSong(job: Job) {
    await this.commandsService.share(job.data.message, job.data.config);
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
  })
  private async updateShare(job: Job) {
    await this.commandsService.updateShare(
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
    name: 'chosenInlineResult',
    concurrency: 2,
  })
  private async chosenInlineResult(job: Job) {
    await this.inlineService.chosenInlineResult(
      job.data.chosenInlineResult,
      job.data.from,
    );
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
}
