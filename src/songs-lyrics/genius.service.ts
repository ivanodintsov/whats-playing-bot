import { FactoryProvider, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Xray from 'x-ray';
import * as extract from 'extract-json-from-string';

const x = Xray();

type SongItem = {
  track_isrc: string;
  track_share_url: string;
};

const searchSong = (search: string): Promise<SongItem[]> => {
  return new Promise((resolve, reject) => {
    x(encodeURI(`https://www.musixmatch.com/search/${search}/tracks`), [
      'script',
    ])((err, scripts: string[]) => {
      if (err) {
        reject(err);
        return;
      }

      const data = [];

      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const regexp = /"attributes":(?<data>\{"(.*))\n/g;
        const matches = [...script.matchAll(regexp)];

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];

          if (match.groups?.data) {
            try {
              const jsonList = extract(match.groups?.data);

              if (jsonList?.length) {
                data.push(...jsonList);
              }
            } catch (error) {}
          }
        }
      }

      if (!data.length) {
        reject(new NotFoundException());
        return;
      }

      resolve(data);
    });
  });
};

const getLyricsFromSong = (song: SongItem): Promise<string> => {
  return new Promise((resolve, reject) => {
    x(encodeURI(song.track_share_url), ['.mxm-lyrics .mxm-lyrics__content'])(
      (err, lyrics: string[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (!lyrics.length) {
          reject(new NotFoundException());
          return;
        }

        resolve(lyrics.join('\n'));
      },
    );
  });
};

const getLyrics = async ({
  search,
  isrc,
}: {
  search: string;
  isrc: string;
}) => {
  if (!isrc) {
    throw new NotFoundException();
  }

  const songs = await searchSong(search);
  const song = songs.find(el => {
    if (!el.track_isrc) {
      return false;
    }

    return el.track_isrc.toLowerCase() === isrc.toLocaleLowerCase();
  });

  if (!song) {
    throw new NotFoundException();
  }

  return await getLyricsFromSong(song);
};

export const GENIUS_SERVICE = 'GENIUS_SERVICE';

export type GeniusClient = {
  getLyrics: (options: { search: string; isrc: string }) => Promise<string>;
};

export const GeniusService: FactoryProvider = {
  provide: GENIUS_SERVICE,
  inject: [ConfigService],
  useFactory: async (appConfig: ConfigService) => {
    return {
      getLyrics: getLyrics,
    };
  },
};
