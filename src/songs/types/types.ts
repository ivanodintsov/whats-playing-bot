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
  qobuz?: T;
  tidal?: T;
  amazon?: T;
  deezer?: T;
  itunes?: T;
}

export type IExternalUrl = {
  url: string;
};

export type IExternalUrls = IExternal<IExternalUrl>;

export type IExternalId = {
  id: string;
};

export type IExternalIds = IExternal<IExternalId>;

export enum ALBUM_TYPE {
  album = 'album',
  single = 'single',
  compilation = 'compilation',
}

export enum RELEASE_DATE_PRECISION {
  year = 'year',
  month = 'month',
  day = 'day',
}

export interface IAlbum {
  albumType: ALBUM_TYPE;
  availableMarkets: string[];
  totalTracks: number;
  links: IExternalUrls;
  ids: IExternalIds;
  image: IImage;
  name: string;
  releaseDate: string;
  releaseDatePrecision: RELEASE_DATE_PRECISION;
}

export interface IArtist {
  genres?: string[];
  name: string;
  image?: IImage;
  links: IExternalUrls;
  ids: IExternalIds;
}

export enum SONG_TYPE {
  track = 'track',
}

export interface ISongSimple {
  name: string;
  type: SONG_TYPE;
  trackNumber: number;
  links: IExternalUrls;
  ids: IExternalIds;
  isrc: string;
}

export interface ISong extends ISongSimple {
  album: IAlbum;
  artists: IArtist[];
}
