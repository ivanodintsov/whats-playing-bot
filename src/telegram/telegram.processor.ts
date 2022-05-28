import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CommandsService } from './commands.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { InlineService } from './inline/inline.service';

@Processor('telegramProcessor')
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    private readonly commandsService: CommandsService,
    private readonly channelPostingService: ChannelPostingService,
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
    private readonly inlineService: InlineService,
  ) {}

  @Process({
    name: 'shareSong',
    concurrency: 2,
  })
  async shareSong(job: Job) {
    await this.commandsService.share(job.data.message);
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
  })
  async updateShare(job: Job) {
    const data = await this.commandsService.updateShare(
      job.data.message,
      job.data.from,
      job.data.track,
      job.data.config,
    );
    this.telegramProcessorQueue.add(
      'postToChat',
      {
        data,
      },
      {
        attempts: 5,
        removeOnComplete: true,
      },
    );
  }

  @Process({
    name: 'postToChat',
    concurrency: 2,
  })
  async postToChat(job: Job) {
    await this.channelPostingService.sendSong(job.data.data);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 2,
  })
  async inlineQuery(job: Job) {
    await this.inlineService.process(job.data.message);
  }

  @Process({
    name: 'chosenInlineResult',
    concurrency: 2,
  })
  async chosenInlineResult(job: Job) {
    await this.inlineService.chosenInlineResult(
      job.data.chosenInlineResult,
      job.data.from,
    );
  }
}
