import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { SongsInfoService } from './songs-info.service';
import { Track } from 'spotify-uri';
import { SONGS_INFO_QUEUE } from './constants';

export type ProcessUpdateFromSongWhipOptions = {
  url: string;
  trackId: Track['id'];
};

export type ProcessUpdateFromSongWhipData = ProcessUpdateFromSongWhipOptions;

@Processor(SONGS_INFO_QUEUE)
export class SongsInfoProcessor {
  private readonly logger = new Logger(SongsInfoProcessor.name);
  private readonly processorName = SongsInfoProcessor.name;

  constructor(private readonly songsInfoService: SongsInfoService) {}

  @Process({
    name: 'processSong',
    concurrency: 2,
  })
  private async processSong(job: Job) {
    return await this.songsInfoService.processParseTrackByTrackUrl(
      job.data.url,
    );
  }

  @Process({
    name: 'updateFromSongWhip',
    concurrency: 2,
  })
  private async processUpdateFromSongWhip(
    job: Job<ProcessUpdateFromSongWhipData>,
  ) {
    return await this.songsInfoService.updateFromExternalByTrackId(job.data);
  }

  @OnQueueFailed()
  private onError(job: Job, error: any) {
    this.logger.debug(
      `Processor: ${this.processorName}. Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
      JSON.stringify(error),
    );
  }
}
