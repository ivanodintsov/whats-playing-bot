import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CommandsService } from './commands.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('telegramProcessor')
export class TelegramProcessor {
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
    await this.commandsService.share(job.data.message);
  }

  @Process({
    name: 'updateShare',
    concurrency: 2,
  })
  async updateShare(job: Job) {
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
  }

  @Process({
    name: 'postToChat',
    concurrency: 2,
  })
  async postToChat(job: Job) {
    await this.channelPostingService.sendSong(job.data.data);
  }
}
