import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { LyricsService } from '../lyrics/lyrics.service';
import { TrackLyric } from '../models/song-lyric.model';
import { Logger } from 'src/logger';
import { Track } from 'src/songs-info/models/track.model';
import { GetLyricsReturn } from '../lyrics/types';
import { Provider } from 'src/songs-info/parser/types';

export type TrackData = {
  id: Track['id'];
  name: Track['name'];
  isrc: Track['isrc'];
  artists: { name: string }[];
  provider: Provider;
  providerId: string;
};

@Injectable()
export class TrackLyricsService {
  private readonly logger = new Logger(TrackLyricsService.name);

  constructor(
    @InjectModel(TrackLyric)
    private trackLyricModel: typeof TrackLyric,
    private lyricsService: LyricsService,
  ) {}

  async getLyrics(
    item: TrackData,
  ): Promise<
    | { lyrics: GetLyricsReturn; created: true }
    | { lyrics: TrackLyric; created: false }
  > {
    try {
      const songLyric = await this.trackLyricModel.findOne({
        where: {
          trackId: item.id,
        },
      });

      if (songLyric) {
        return {
          lyrics: songLyric,
          created: false,
        };
      }

      let search = item.name;
      const artists = item.artists;
      const artistName = artists?.map?.((artist) => artist.name)?.join?.(' ');

      if (artists) {
        search = search + ' ' + artistName;
      }

      const lyrics = await this.lyricsService.getLyrics({
        provider: item.provider,
        providerId: item.providerId,
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
          language: lyrics.language,
          raw: lyrics.raw,
        });
      } catch (error) {
        this.logger.debug(error.message, error.stack);
      }

      if (!lyrics) {
        return {
          lyrics: null,
          created: false,
        };
      }

      return {
        lyrics,
        created: true,
      };
    } catch (error) {
      this.logger.debug(error.message, error.stack);

      return {
        lyrics: null,
        created: false,
      };
    }
  }

  async findByTrackId(id: string) {
    const songLyric = await this.trackLyricModel.findOne({
      where: {
        trackId: id,
      },
    });

    return songLyric;
  }
}
