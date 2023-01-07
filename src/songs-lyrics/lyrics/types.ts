import { Maybe } from 'src/typings';
import { PROVIDERS, STATUSES } from '../models/song-lyric.model';

export type LyricsNotFound = {
  lyrics: null;
  status: STATUSES.NEED_MANUAL_CREATION;
  provider: PROVIDERS.MANUAL;
  language: null;
  raw: null;
};

export type Lyrics = {
  lyrics: string;
  isrcs: Maybe<string[]>;
  socials: {
    twitter: Maybe<string>;
    website: Maybe<string>;
    instagram: Maybe<string>;
    tiktok: Maybe<string>;
    facebook: Maybe<string>;
  };
  status: STATUSES.WAIT_MODERATION | STATUSES.COMPLETED;
  provider: PROVIDERS.MUSIXMATCH | PROVIDERS.SPOTIFY;
  language: Maybe<string>;
  raw: any;
};

export type GetLyricsReturn = Lyrics | LyricsNotFound;
