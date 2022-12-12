import { HttpService, Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SongWhip, SongWhipDocument } from 'src/schemas/song-whip.schema';
import { Logger } from 'src/logger';

type SongInput = {
  url: string;
  country?: string;
};

type Song = {
  link: string;
};

type SongDict = {
  tidal: Song;
  itunes: Song;
  spotify: Song;
  youtubeMusic: Song;
};

type SongResponse = {
  data: SongWhip;
};

@Injectable()
export class SongWhipService {
  private readonly API_URL: string = 'https://songwhip.com/api/';
  private readonly logger = new Logger(SongWhipService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(SongWhip.name)
    private readonly songWhipModel: Model<SongWhipDocument>,
  ) {}

  getCachedSong(input: SongInput) {
    return this.songWhipModel.findOne({
      searchTrackUrl: input.url,
    });
  }

  getCachedSongs(urls: string[]) {
    return this.songWhipModel.find({
      searchTrackUrl: {
        $in: urls,
      },
    });
  }

  async getSongById(id: string) {
    return this.songWhipModel.findById(id);
  }

  async cacheSong(input: SongInput, data: SongResponse['data']) {
    try {
      await this.songWhipModel.updateOne(
        {
          searchTrackUrl: input.url,
        },
        data,
        { upsert: true },
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  async getSong(input: SongInput): Promise<SongWhip | null> {
    // const cachedSong = await this.getCachedSong(input);

    // if (cachedSong) {
    //   return cachedSong;
    // }

    const response = await this.httpService
      .post<SongResponse>(this.API_URL, input)
      .toPromise();
    const data: SongResponse['data'] = R.path(
      ['data', 'data', 'item'],
      response,
    );

    if (!data) {
      return null;
    }

    this.cacheSong(input, data);

    return data;
  }
}
