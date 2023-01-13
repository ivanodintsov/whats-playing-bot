import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { Logger } from 'src/logger';
import { SongWhip } from './song-whip.entity';

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

  constructor(private readonly httpService: HttpService) {}

  async getSong(input: SongInput): Promise<SongWhip | null> {
    const response = await this.httpService
      .post<SongResponse>(this.API_URL, input)
      .toPromise();
    const rawData: SongResponse['data'] = R.path(
      ['data', 'data', 'item'],
      response,
    );

    if (!rawData) {
      return null;
    }

    return rawData;
  }
}
