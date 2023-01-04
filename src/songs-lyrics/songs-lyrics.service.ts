import { Injectable, Inject } from '@nestjs/common';
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
import { STATUSES, TrackLyric } from './models/song-lyric.model';
import { InjectModel } from '@nestjs/sequelize';
import { Track } from 'src/songs-info/models/track.model';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { SOCIALS, SOCIAL_STATUSES } from 'src/songs-info/types/parser';

@Injectable()
export class SongsLyricsService {
  private readonly logger = new Logger(SongsLyricsService.name);

  constructor(
    @InjectModel(TrackLyric)
    private trackLyricModel: typeof TrackLyric,

    @InjectQueue(SONGS_QUEUE)
    private songsQueue: Queue<SongsQueueJobData>,

    private songWhip: SongWhipService,

    @Inject(GENIUS_SERVICE)
    private geniusClient: GeniusClient,

    private songsInfoService: SongsInfoService,
  ) {}

  async getLyrics(item: Track) {
    try {
      const songLyric = await this.trackLyricModel.findOne({
        where: {
          trackId: item.id,
        },
      });

      if (songLyric) {
        return songLyric.text;
      }

      let search = item.name;

      const artists = item.artists;

      const artistName = artists?.map?.(artist => artist.name)?.join?.(' ');

      if (artists) {
        search = search + ' ' + artistName;
      }

      const lyrics = await this.geniusClient.getLyrics({
        search,
        isrc: item.isrc?.[0],
        trackName: item.name,
        artistName,
      });

      try {
        await this.trackLyricModel.create({
          trackId: item.id,
          text: lyrics.lyrics,
          status: lyrics.status,
          provider: lyrics.provider,
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }

      if (!lyrics) {
        return null;
      }

      if (lyrics.status === STATUSES.COMPLETED) {
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

            await this.songsInfoService.addArtistSocialToTrack(item.id, {
              status: statusesMAP[lyrics.status],
              social: socialsMAP[social],
              url,
            });
          }
        } catch (error) {
          this.logger.error(error.message, error.stack);
        }

        try {
          const isrcs = lyrics.isrcs;
          await this.songsInfoService.addTrackIsrcs(item.id, isrcs);
        } catch (error) {
          this.logger.error(error.message, error.stack);
        }
      }

      return lyrics;
    } catch (error) {
      this.logger.error(error.message, error.stack);

      return null;
    }
  }

  async getCachedLyrics(item: Track) {
    const songLyric = await this.trackLyricModel.findOne({
      where: {
        trackId: item.id,
      },
    });

    if (songLyric) {
      return songLyric?.text;
    }

    this.addToQueue(item);

    return null;
  }

  async addToQueue(item: Track) {
    try {
      const jobData: GetLyricsData = {
        track: item,
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
