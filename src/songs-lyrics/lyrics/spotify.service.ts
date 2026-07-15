import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PROVIDERS, STATUSES } from '../models/song-lyric.model';
// import { SpotifyLyrics } from 'spotify-lyrics-js';
import { GetLyricsReturn } from './types';
import { Provider } from 'src/songs-info/parser/types';

export const SPOTIFY_LYRICS_SERVICE = 'SPOTIFY_LYRICS_SERVICE';

throw new Error('Please uncomment code!');

export type SpotifyLyricsService = {
  getLyrics: (obj: {
    provider: Provider;
    providerId: string;
  }) => Promise<GetLyricsReturn>;
};

export const SpotifyLyricsService: FactoryProvider = {
  provide: SPOTIFY_LYRICS_SERVICE,
  inject: [ConfigService],
  useFactory: async (appConfig: ConfigService) => {
    // const spotifyLyrics = new SpotifyLyrics(
    //   appConfig.get<string>('SPOTIFY_SP_DC_TOKEN'),
    //   process.cwd(),
    // );

    const getLyrics: SpotifyLyricsService['getLyrics'] = async ({
      provider,
      providerId,
    }) => {
      try {
        // const lyrics = await spotifyLyrics.getLyrics(providerId);
        // const lyricsText = lyrics.lyrics.lines
        //   .map(item => {
        //     if (item.words === '♪') {
        //       return null;
        //     }
        //     if (item.words === '') {
        //       return null;
        //     }
        //     return item.words;
        //   })
        //   .filter(el => el)
        //   .join('\n');
        // return {
        //   isrcs: null,
        //   socials: null,
        //   lyrics: lyricsText,
        //   status: STATUSES.COMPLETED,
        //   provider: PROVIDERS.SPOTIFY,
        //   language: lyrics?.lyrics?.language,
        //   raw: lyrics,
        // };
      } catch (error) {
        return {
          lyrics: null,
          status: STATUSES.NEED_MANUAL_CREATION,
          provider: PROVIDERS.MANUAL,
          language: null,
          raw: null,
        };
      }
    };

    return {
      getLyrics: getLyrics,
    };
  },
};
