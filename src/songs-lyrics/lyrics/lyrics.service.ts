import { Inject, Injectable } from '@nestjs/common';
import { Provider } from 'src/songs-info/parser/parser.service';
import { GeniusClient, GENIUS_SERVICE } from './genius.service';
import {
  SpotifyLyricsService,
  SPOTIFY_LYRICS_SERVICE,
} from './spotify.service';

@Injectable()
export class LyricsService {
  constructor(
    @Inject(GENIUS_SERVICE)
    private geniusClient: GeniusClient,

    @Inject(SPOTIFY_LYRICS_SERVICE)
    private spotifyLyricsService: SpotifyLyricsService,
  ) {}

  async getLyrics(
    data: {
      search: string;
      isrc: string;
      trackName: string;
      artistName: string;
    } & {
      provider: Provider;
      providerId: string;
    },
  ) {
    const lyrics = await this.spotifyLyricsService.getLyrics(data);
    // const lyrics = await this.geniusClient.getLyrics(data);

    return lyrics;
  }
}
