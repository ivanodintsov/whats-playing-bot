import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CommandsService } from './commands.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';

@Processor('telegramProcessor')
export class TelegramProcessor {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    private readonly commandsService: CommandsService,
    private readonly channelPostingService: ChannelPostingService,
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
  ) {}

  @Process({
    name: 'shareSong',
    concurrency: 2,
  })
  async shareSong(job: Job) {
    try {
      await this.commandsService.share(job.data.message);
    } catch (error) {
      this.logger.error('shareSong', error);
    }
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
  })
  async updateShare(job: Job) {
    try {
      const data = await this.commandsService.updateShare(
        job.data.messageToUpdate,
        job.data.message,
        job.data.track,
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
    } catch (error) {
      this.logger.error('updateShare', error);
    }
  }

  @Process({
    name: 'postToChat',
    concurrency: 2,
  })
  async postToChat(job: Job) {
    try {
      await this.channelPostingService.sendSong(job.data.data);
    } catch (error) {
      this.logger.error('postToChat', error);
    }
  }
}
