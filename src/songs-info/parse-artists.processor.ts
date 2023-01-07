import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { PARSE_ARTISTS_QUEUE } from './constants';
import { Provider } from './parser/parser.service';
import { ProcessService } from './process/process.service';

export type ProcessArtistAlbumsJobData = {
  artistId: string;
  provider: Provider;
  data: any;
};

@Processor(PARSE_ARTISTS_QUEUE)
export class ParseArtistsProcessor {
  private readonly logger = new Logger(ParseArtistsProcessor.name);
  private readonly processorName = ParseArtistsProcessor.name;

  constructor(private readonly processService: ProcessService) {}

  @Process({
    name: 'processArtistAlbums',
    concurrency: 2,
  })
  private async processArtistAlbums(job: Job<ProcessArtistAlbumsJobData>) {
    return await this.processService.processArtistAlbums(job.data);
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
