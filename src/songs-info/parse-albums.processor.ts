import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { PARSE_ALBUMS_QUEUE } from './constants';
import { ProcessService } from './process/process.service';
import { Provider } from './parser/types';

export type ProcessAlbumIdData = {
  albumId: any;
  provider: Provider;
};

@Processor(PARSE_ALBUMS_QUEUE)
export class ParseAlbumsProcessor {
  private readonly logger = new Logger(ParseAlbumsProcessor.name);
  private readonly processorName = ParseAlbumsProcessor.name;

  constructor(private readonly processService: ProcessService) {}

  @Process({
    name: 'processAlbumId',
    concurrency: 2,
  })
  private async processAlbumId(job: Job<ProcessAlbumIdData>) {
    return await this.processService.processAlbumId(job.data);
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
