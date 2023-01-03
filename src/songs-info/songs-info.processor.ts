import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { SongsInfoService } from './songs-info.service';

@Processor('songsInfoQueue')
export class SongsInfoProcessor {
  private readonly logger = new Logger(SongsInfoProcessor.name);

  constructor(private readonly songsInfoService: SongsInfoService) {}

  @Process({
    name: 'processSong',
    concurrency: 2,
  })
  private async processSong(job: Job) {
    return await this.songsInfoService.parseSong(job.data.url);
  }
}
