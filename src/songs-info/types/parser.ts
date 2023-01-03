import { Maybe } from 'src/typings';

type ServiceURL = {
  id: string;
  type?: string;
};

export type SpotifyURL = {
  type: 'spotify';
  url: ServiceURL;
};

export type YouTubeURL = {
  type: 'youtube';
  url: ServiceURL;
};

export type TidalURL = {
  type: 'tidal';
  url: ServiceURL;
};

export type ParsedURL = SpotifyURL | YouTubeURL | TidalURL;

export interface IImage {
  height?: number;
  width?: number;
  url: string;
}

export interface IExternal<T> {
  spotify?: T;
  youtube?: T;
  youtubeMusic?: T;
}

export type IExternalUrl = {
  providerUrl: string;
  providerId: string;
  provider: string;
};

export type IExternalUrls = IExternalUrl[];

export type IExternalId = {
  id: string;
};

export type IExternalIds = IExternal<IExternalId>;

export enum ALBUM_TYPE {
  album,
  single,
  compilation,
}

export enum RELEASE_DATE_PRECISION {
  year = 'year',
  month = 'month',
  day = 'day',
}

export interface IAlbum {
  id?: string;
  name: string;
  albumType: Maybe<ALBUM_TYPE>;
  availableMarkets: Maybe<string[]>;
  totalTracks: Maybe<number>;
  links: Maybe<IExternalUrls>;
  image: Maybe<IImage>;
  releaseDate: Maybe<Date>;
  artists: IArtist[];
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
}

export interface IArtist {
  id?: string;
  genres: Maybe<IGenre[]>;
  name: string;
  image: Maybe<IImage>;
  links: Maybe<IExternalUrls>;
}

export interface IGenre {
  slug: string;
  title?: string;
}

export enum SONG_TYPE {
  track = 'track',
}

export interface ISongSimple {
  name: string;
  type: SONG_TYPE;
  trackNumber: number;
  links: IExternalUrls;
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
  explicit: boolean;
  duration: number;
}

export interface ISong extends ISongSimple {
  album: IAlbum;
  artists: IArtist[];
}
