import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from 'src/logger';
import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';
import { SONGS_QUEUE } from './constants';
import { Track } from 'src/songs-info/models/track.model';
import { GetLyricsReturn } from 'src/songs-lyrics/lyrics/types';
import { STATUSES } from 'src/songs-lyrics/models/song-lyric.model';
import { SOCIALS, SOCIAL_STATUSES } from 'src/songs-info/types/parser';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { TrackData } from 'src/songs-lyrics/track-lyrics/track-lyrics.service';

export type GetLyricsData = {
  track?: TrackData;
};

export type UpdateTrackData = {
  track: TrackData;
  lyrics: GetLyricsReturn;
};

export type SongsQueueJobData = GetLyricsData;

@Processor(SONGS_QUEUE)
export class SongsQueueProcessor {
  private readonly logger = new Logger(SongsQueueProcessor.name);

  constructor(
    private readonly lyricsService: SongsLyricsService,
    private readonly songsInfoService: SongsInfoService,
  ) {}

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

  @Process({
    name: 'getLyricsRemote',
    concurrency: 2,
  })
  private async getLyricsRemote(job: Job<GetLyricsData>) {
    if (!job.data.track) {
      return;
    }

    await this.lyricsService.getLyricsRemote(job.data.track);
  }

  @Process({
    name: 'updateTrackData',
    concurrency: 2,
  })
  private async updateTrackData(job: Job<UpdateTrackData>) {
    const lyrics = job.data.lyrics;
    const track = job.data.track;

    if (lyrics.status === STATUSES.COMPLETED) {
      if (lyrics.socials) {
        try {
          const socials = Object.entries(lyrics.socials).filter(
            ([social, url]) => url,
          );
          const statusesMAP = {
            [STATUSES.COMPLETED]: SOCIAL_STATUSES.COMPLETED,
          };
          const socialsMAP = {
            twitter: SOCIALS.TWITTER,
            website: SOCIALS.WEBSITE,
            instagram: SOCIALS.INSTAGRAM,
            tiktok: SOCIALS.TIKTOK,
            facebook: SOCIALS.FACEBOOK,
          };

          for (let i = 0; i < socials?.length; i++) {
            const [social, url] = socials[i];

            await this.songsInfoService.addArtistSocialToTrack(track.id, {
              status: statusesMAP[lyrics.status],
              social: socialsMAP[social],
              url,
            });
          }
        } catch (error) {
          this.logger.error(error.message, error.stack);
        }
      }

      if (lyrics.isrcs) {
        try {
          const isrcs = lyrics.isrcs;
          await this.songsInfoService.addTrackIsrcs(track.id, isrcs);
        } catch (error) {
          this.logger.error(error.message, error.stack);
        }
      }
    }
  }

  @OnQueueFailed()
  private onError(job: Job<SongsQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
