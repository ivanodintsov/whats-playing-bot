import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';
import { SONGS_QUEUE } from './constants';
import { Track } from 'src/songs-info/models/track.model';

export type GetLyricsData = {
  track?: Track;
};

export type SongsQueueJobData = GetLyricsData;

@Processor(SONGS_QUEUE)
export class SongsQueueProcessor {
  private readonly logger = new Logger(SongsQueueProcessor.name);

  constructor(private readonly lyricsService: SongsLyricsService) {}

  @Process({
    name: 'getLyrics',
    concurrency: 2,
  })
  private async getLyrics(job: Job<GetLyricsData>) {
    if (!job.data.track) {
      return;
    }

    await this.lyricsService.getLyrics(job.data.track);
  }

  @OnQueueFailed()
  private onError(job: Job<SongsQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
