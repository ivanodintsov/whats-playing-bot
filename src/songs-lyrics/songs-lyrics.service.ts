import { Injectable, Inject } from '@nestjs/common';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongLyric, SongLyricDocument } from 'src/schemas/song-lyric.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import {
  GetLyricsData,
  SongsQueueJobData,
} from 'src/songs-queue/songs-queue.processor';
import { InjectQueue } from '@nestjs/bull';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { Logger } from 'src/logger';
import { GeniusClient, GENIUS_SERVICE } from './genius.service';

@Injectable()
export class SongsLyricsService {
  private readonly logger = new Logger(SongsLyricsService.name);

  constructor(
    @InjectModel(SongLyric.name)
    private songsLyrics: Model<SongLyricDocument>,

    @InjectQueue(SONGS_QUEUE)
    private songsQueue: Queue<SongsQueueJobData>,

    @Inject(GENIUS_SERVICE)
    private geniusClient: GeniusClient,
  ) {}

  async getLyrics(item: SongWhip) {
    try {
      const songLyric = await this.songsLyrics.findOne({
        songId: item._id,
      });

      if (songLyric) {
        return songLyric.text;
      }

      let search = item.name;

      if (item.artists) {
        search =
          search +
          ' ' +
          item.artists?.map?.(artist => artist.name)?.join?.(' ');
      }

      const lyrics = await this.geniusClient.getLyrics({
        search,
        isrc: item.isrc,
      });

      try {
        const songsLyrics = new this.songsLyrics({
          songId: item._id,
          text: lyrics,
          status: 'wait_moderation',
          provider: 'musixmatch',
        });

        await songsLyrics.save();
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }

      if (!lyrics) {
        return null;
      }

      return lyrics;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      return null;
    }
  }

  async getCachedLyrics(item: SongWhip) {
    const songLyric = await this.songsLyrics.findOne({
      songId: item._id,
    });

    if (songLyric) {
      return songLyric?.text;
    }

    this.addToQueue(item);

    return null;
  }

  async addToQueue(item: SongWhip) {
    try {
      const jobData: GetLyricsData = {
        songWhip: item,
      };

      await this.songsQueue.add('getLyrics', jobData, {
        attempts: 1,
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }
}
