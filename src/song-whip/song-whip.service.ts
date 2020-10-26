import { HttpService, Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SongWhip, SongWhipDocument } from 'src/schemas/song-whip.schema';

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
  data: {
    links: SongDict;
    image: string;
  }
};

@Injectable()
export class SongWhipService {
  private readonly API_URL: string = 'https://songwhip.com/api/';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(SongWhip.name) private readonly songWhipModel: Model<SongWhipDocument>,
  ) {}

  getCachedSong(input: SongInput) {
    return this.songWhipModel.findOne({
      searchTrackUrl: input.url,
    });
  }

  async cacheSong(input: SongInput, data: SongResponse['data']) {
    try {
      const song = new this.songWhipModel({
        ...data,
        searchTrackUrl: input.url,
        country: input.country,
      });
      await song.save();
      return song;
    } catch (error) {
      console.log(error);
    }
  }

  async getSong(input: SongInput) {
    const cachedSong = await this.getCachedSong(input);

    if (cachedSong) {
      return cachedSong;
    }

    const response = await this.httpService.post<SongResponse>(this.API_URL, input).toPromise();
    const data: SongResponse['data'] = R.path(['data', 'data'], response);

    this.cacheSong(input, data);

    return data;
  }
}
