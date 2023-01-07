import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { SongsInfoService } from './songs-info.service';

@Processor('songsInfoQueue')
export class SongsInfoProcessor {
  private readonly logger = new Logger(SongsInfoProcessor.name);
  private readonly processorName = SongsInfoProcessor.name;

  constructor(private readonly songsInfoService: SongsInfoService) {}

  @Process({
    name: 'processSong',
    concurrency: 2,
  })
  private async processSong(job: Job) {
    return await this.songsInfoService.parseSong(job.data.url);
  }

  @OnQueueFailed()
  private onError(job: Job, error: any) {
    this.logger.error(
      `Processor: ${this.processorName}. Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
      JSON.stringify(error),
    );
  }
}
