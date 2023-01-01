import { Injectable, Inject } from '@nestjs/common';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongLyric, SongLyricDocument } from 'src/schemas/song-lyric.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Queue } from 'bull';
import {
  GetLyricsData,
  SongsQueueJobData,
} from 'src/songs-queue/songs-queue.processor';
import { InjectQueue } from '@nestjs/bull';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { Logger } from 'src/logger';
import { GeniusClient, GENIUS_SERVICE } from './genius.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';

@Injectable()
export class SongsLyricsService {
  private readonly logger = new Logger(SongsLyricsService.name);

  constructor(
    @InjectModel(SongLyric.name)
    private songsLyrics: Model<SongLyricDocument>,

    @InjectQueue(SONGS_QUEUE)
    private songsQueue: Queue<SongsQueueJobData>,

    private songWhip: SongWhipService,

    @Inject(GENIUS_SERVICE)
    private geniusClient: GeniusClient,
  ) {}

  async getLyrics(item: SongWhip) {
    try {
      const songId = new mongoose.mongo.ObjectId(item._id);
      const songLyric = await this.songsLyrics.findOne({
        songId,
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

      let lyrics: string | null = null;

      try {
        const newLyrics = await this.geniusClient.getLyrics({
          search,
          isrc: item.isrc,
        });

        if (newLyrics) {
          lyrics = newLyrics;
        }
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }

      try {
        const songsLyrics = new this.songsLyrics({
          songId,
          text: lyrics,
          status: lyrics ? 'wait_moderation' : 'need_manual_creation',
          provider: lyrics ? 'musixmatch' : 'manual',
        });

        await songsLyrics.save();

        await this.songWhip.updateLyricId(item, songsLyrics);
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
    const songId = new mongoose.mongo.ObjectId(item._id);
    const songLyric = await this.songsLyrics.findOne({
      songId,
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
