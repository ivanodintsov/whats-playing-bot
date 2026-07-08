import { Injectable } from '@nestjs/common';
import * as spotifyUri from 'spotify-uri';
import { MusicServiceURI } from './types';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

@Injectable()
export class MusicServicesUriParserService {
  private parsers: ((uri: string) => MusicServiceURI)[];

  constructor() {
    this.parsers = [this.pasrseSpotifyUri];
  }

  parseUri(uri: string): MusicServiceURI {
    for (let i = 0; i < this.parsers.length; i++) {
      try {
        const parseed = this.parsers[i](uri);

        return parseed;
      } catch (error) {}
    }

    throw Error('URI Parse Error');
  }

  pasrseSpotifyUri(uri: string): MusicServiceURI {
    const parsed = spotifyUri.parse(uri);

    if (parsed.type === 'track') {
      const parsedUrl = parsed as spotifyUri.Track;

      return {
        type: MUSIC_SERVICE_PROVIDERS.SPOTIFY,
        uri: {
          id: parsedUrl.id,
          type: 'track',
        },
      };
    }

    throw Error('URI Parse Error');
  }
}
