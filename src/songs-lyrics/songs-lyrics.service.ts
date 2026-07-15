import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import {
  GetLyricsData,
  SongsQueueJobData,
  UpdateTrackData,
} from 'src/songs-queue/songs-queue.processor';
import { GetLyricsReturn } from './lyrics/types';
import {
  TrackData,
  TrackLyricsService,
} from './track-lyrics/track-lyrics.service';

@Injectable()
export class SongsLyricsService {
  private readonly logger = new Logger(SongsLyricsService.name);

  constructor(
    @InjectQueue(SONGS_QUEUE)
    private songsQueue: Queue<SongsQueueJobData>,
    private trackLyricsService: TrackLyricsService,
    private readonly httpService: HttpService,
    private readonly appConfig: ConfigService,
  ) {}

  async getLyrics(item: TrackData) {
    const data = await this.trackLyricsService.getLyrics(item);

    if (data.lyrics && data.created) {
      await this.addUpdateTrackToQueue(item, data.lyrics);
    }
  }

  async getCachedLyrics(item: TrackData) {
    const songLyric = await this.trackLyricsService.findByTrackId(item.id);

    if (songLyric) {
      return songLyric?.text;
    }

    this.addTrackToQueue(item);

    return null;
  }

  async addTrackToQueue(item: TrackData) {
    try {
      const jobData: GetLyricsData = {
        track: item,
      };

      await this.songsQueue.add('getLyrics', jobData, {
        attempts: 1,
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  async addUpdateTrackToQueue(track: TrackData, lyrics: GetLyricsReturn) {
    try {
      const jobData: UpdateTrackData = {
        track,
        lyrics,
      };

      await this.songsQueue.add('updateTrackData', jobData, {
        attempts: 1,
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  async addTrackToRemoteQueue(item: TrackData) {
    try {
      const jobData: GetLyricsData = {
        track: item,
      };

      await this.songsQueue.add('getLyricsRemote', jobData, {
        attempts: 1,
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack, 'addTrackToRemoteQueue');
    }
  }

  async getLyricsRemote(item: TrackData) {
    await this.httpService
      .post(`${this.appConfig.get('REMOTE_LYRICS_URL')}/add-track`, item)
      .toPromise();
  }
}
