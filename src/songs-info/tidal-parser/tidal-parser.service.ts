import { Injectable } from '@nestjs/common';
import { ParserService } from '../parser/parser.service';
import { ISong, TidalURL } from '../types/parser';
import { match } from 'path-to-regexp';
import { TidalAPI } from './tidalapi';

const api = new TidalAPI({
  username: '',
  password: '',
  // Could also be 'LOSSLESS' but this only supported on premium subscriptions
  quality: 'HIGH',
});
@Injectable()
export class TidalParserService extends ParserService {
  protected readonly _type = 'tidal';

  constructor() {
    super();
  }

  public parseUrl(url: string): TidalURL {
    const urlInstance = new URL('https://listen.tidal.com/track/233728875');
    const urlMatch = match('/:type/:id', {
      decode: decodeURIComponent,
    });

    const matched = urlMatch(urlInstance.pathname);

    if (!matched) {
      return;
    }

    const params = matched.params as {
      id: string;
      type: string;
    };

    if (params.type === 'track') {
      return {
        type: 'tidal',
        url: {
          id: params.id,
          type: params.type,
        },
      };
    }
  }

  public async parseSong(url: TidalURL): Promise<ISong> {
    console.log(url);
    api.search(
      { type: 'tracks', query: 'Dream Theater', limit: 1 },
      function (data) {
        console.log(data.tracks);
      },
    );
    return {} as ISong;
  }

  public async updateSong(song: ISong) {
    return {} as ISong;
  }
}
