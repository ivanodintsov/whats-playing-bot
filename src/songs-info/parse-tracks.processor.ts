import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { PARSE_TRACKS_QUEUE } from './constants';
import { Provider } from './parser/types';
import { ProcessService } from './process/process.service';

export type ProcessAlbumTracksData = {
  albumId: any;
  provider: Provider;
  data: any;
};

export type ProcessTrackIdData = {
  trackId: any;
  provider: Provider;
};

@Processor(PARSE_TRACKS_QUEUE)
export class ParseTracksProcessor {
  private readonly logger = new Logger(ParseTracksProcessor.name);
  private readonly processorName = ParseTracksProcessor.name;

  constructor(private readonly processService: ProcessService) {}

  @Process({
    name: 'processAlbumTracks',
    concurrency: 2,
  })
  private async processAlbumTracks(job: Job<ProcessAlbumTracksData>) {
    return await this.processService.processAlbumTracks(job.data);
  }

  @Process({
    name: 'processTrackId',
    concurrency: 2,
  })
  private async processTrackId(job: Job<ProcessTrackIdData>) {
    return await this.processService.processTrackId(job.data);
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
