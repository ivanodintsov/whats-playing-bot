import { FactoryProvider, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Xray from 'x-ray';
import * as extract from 'extract-json-from-string';
import { Maybe } from 'src/typings';

const x = Xray();

type COMMON_TRACK_ISRSC = (string | string[])[];

type SongItem = {
  track_isrc: string;
  track_share_url: string;
  track_name: string;
  commontrack_isrcs: Maybe<COMMON_TRACK_ISRSC>;
  artist_name: string;
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

const filterSongByISRC = (songs: SongItem[], isrc: string) => {
  return songs.find(el => {
    if (!isrc) {
      return false;
    }

    const foundInCommonISRCs = el.commontrack_isrcs?.find?.(el => {
      if (Array.isArray(el)) {
        return el?.find?.(el => el === isrc);
      }

      return el === isrc;
    });

    if (foundInCommonISRCs) {
      return true;
    }

    if (!el?.track_isrc) {
      return false;
    }

    return el.track_isrc.toLowerCase() === isrc.toLowerCase();
  });
};

const filterSongByTrackName = (songs: SongItem[], trackName: string) => {
  return songs.find(el => {
    if (!el.track_name || !trackName) {
      return false;
    }

    return (
      el.track_name.toLowerCase().trim() === trackName.toLowerCase().trim()
    );
  });
};

const filterSongByFullName = (
  songs: SongItem[],
  trackName: string,
  artistName: string,
) => {
  return songs.find(el => {
    if (!el.track_name || !trackName || !el.artist_name || !artistName) {
      return false;
    }

    return (
      el.track_name.toLowerCase().trim() === trackName.toLowerCase().trim() &&
      el.artist_name.toLowerCase().trim() === artistName.toLowerCase().trim()
    );
  });
};

export const STATUSES = {
  WAIT_MODERATION: 'wait_moderation',
  NEED_MANUAL_CREATION: 'need_manual_creation',
  COMPLETED: 'completed',
} as const;

type StatusKeys = keyof typeof STATUSES;
type Status = typeof STATUSES[StatusKeys];

type LyricsNotFound = {
  lyrics: null;
  status: typeof STATUSES.NEED_MANUAL_CREATION;
  provider: 'manual';
};

type Lyrics = {
  lyrics: string;
  status: typeof STATUSES.WAIT_MODERATION | typeof STATUSES.COMPLETED;
  provider: 'musixmatch';
};

export type GetLyricsReturn = Lyrics | LyricsNotFound;

const getLyrics = async ({
  search,
  isrc,
  trackName,
  artistName,
}: {
  search: string;
  isrc: string;
  trackName: string;
  artistName: string;
}): Promise<GetLyricsReturn> => {
  try {
    const songs = await searchSong(search);
    let status: Status = STATUSES.NEED_MANUAL_CREATION;

    let song = filterSongByISRC(songs, isrc);

    if (song) {
      status = STATUSES.COMPLETED;
    }

    if (!song) {
      song = filterSongByFullName(songs, trackName, artistName);

      if (song) {
        status = STATUSES.COMPLETED;
      }
    }

    if (!song) {
      song = filterSongByTrackName(songs, trackName);

      if (song) {
        status = STATUSES.WAIT_MODERATION;
      }
    }

    if (status === STATUSES.NEED_MANUAL_CREATION) {
      return {
        lyrics: null,
        status,
        provider: 'manual',
      };
    }

    const lyrics = await getLyricsFromSong(song);

    return {
      lyrics,
      status,
      provider: 'musixmatch',
    };
  } catch (error) {
    console.log(error);
    return {
      lyrics: null,
      status: STATUSES.NEED_MANUAL_CREATION,
      provider: 'manual',
    };
  }
};

export const GENIUS_SERVICE = 'GENIUS_SERVICE';

export type GeniusClient = {
  getLyrics: typeof getLyrics;
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
