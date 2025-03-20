import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { FRONTEND_QUEUE } from './constants';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TRACK_STATUS } from './models/track.model';
import { fromUUID } from './dto/utils';

export type ProcessTrackData = {
  url: string;
};

@Processor(FRONTEND_QUEUE)
export class FrontendProcessor {
  private readonly logger = new Logger(FrontendProcessor.name);
  private readonly processorName = FrontendProcessor.name;

  constructor(
    private readonly songsInfoService: SongsInfoService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Process({
    name: 'frontendProcessTrackURL',
    concurrency: 10,
  })
  private async processTrack(job: Job<ProcessTrackData>) {
    try {
      const data = await this.songsInfoService.getSong({ url: job.data.url });
      console.log(data);
      await this.cacheManager.set(
        `song-process${job.data.url}`,
        {
          status: TRACK_STATUS.done,
          id: fromUUID({ value: data.id }),
        },
        { ttl: 60 },
      );
    } catch (error) {
      await this.cacheManager.set(
        `song-process${job.data.url}`,
        {
          status: TRACK_STATUS.notFound,
        },
        { ttl: 60 },
      );
    }
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
