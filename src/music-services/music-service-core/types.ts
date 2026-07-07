import { Maybe } from 'src/typings';
import { TrackEntity } from '../domain/Track';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDES } from 'src/constants';
import { PLAY_ACTIONS, TOGGLE_ACTIONS } from './constants';

export type Provider = 'spotify';

export enum SOCIALS {
  WEBSITE,
  TWITTER,
  INSTAGRAM,
  TIKTOK,
  FACEBOOK,
}

export enum SOCIAL_STATUSES {
  WAIT_MODERATION,
  COMPLETED,
}

export class ArtistSocialDomain {
  id?: string;
  artistId: string;
  social: SOCIALS;
  url: string;
  status: SOCIAL_STATUSES;
}

export enum ALBUM_TYPE {
  album,
  single,
  compilation,
}

export type IExternalUrl = {
  providerUrl: string;
  providerId: Maybe<string>;
  provider: Provider;
};

export type IExternalUrls = IExternalUrl[];

export interface IImageBase {
  height?: number;
  width?: number;
  url: string;
}

export interface IImage extends IImageBase {
  medium?: Maybe<IImageBase>;
  small?: Maybe<IImageBase>;
  alternative?: Maybe<IImageBase>;
}

export interface IAlbumSimple {
  id?: string;
  name: string;
  albumType: Maybe<ALBUM_TYPE>;
  availableMarkets: Maybe<string[]>;
  totalTracks: Maybe<number>;
  links: Maybe<IExternalUrls>;
  image: Maybe<IImage>;
  releaseDate: Maybe<Date>;
  artists: IArtistSimple[];
}

export interface IAlbum extends IAlbumSimple {
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
}

export interface IArtistSimple {
  id?: string;
  name: string;
  links: Maybe<IExternalUrls>;
}

export interface IArtist extends IArtistSimple {
  genres: Maybe<IGenre[]>;
  image: Maybe<IImage>;
  socials?: Maybe<ArtistSocialDomain[]>;
}

export interface IGenre {
  slug: string;
  title?: string;
}

export interface ITrackSimple {
  id?: string;
  oldId?: string;
  name: string;
  type: SONG_TYPE;
  trackNumber: Maybe<number>;
  links: IExternalUrls;
  explicit: boolean;
  duration: Maybe<number>;
}

export interface ITrack extends ITrackSimple {
  album: IAlbumSimple;
  artists: IArtistSimple[];
  artist?: Maybe<IArtistSimple>;
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
}

export enum RELEASE_DATE_PRECISION {
  year = 'year',
  month = 'month',
  day = 'day',
}

export enum SONG_TYPE {
  track,
}

export type Pagination = {
  pagination: {
    offset: string;
    next: Maybe<string>;
  };
};

export type PaginatedResponse<T1> = {
  items: T1[];
} & Pagination;

export type SearchResponse = {
  tracks: TrackEntity[];
} & Pagination;

export type CurrentTrackResponse = TrackEntity;
export type TrackResponse = TrackEntity;
export type FullTrackResponse = ITrack;
export type ArtistResponse = IArtist;
export type AlbumResponse = IAlbum;
export type ArtistAlbumsResponse = PaginatedResponse<IAlbumSimple>;
export type AlbumTracksResponse = PaginatedResponse<ITrackSimple>;

export type ProfileResponse = {
  id: string;
  username: Maybe<string>;
  uri: Maybe<string>;
  url: Maybe<string>;
};

export type TogglePlayResponse = {
  action: typeof PLAY_ACTIONS.PLAYING | typeof PLAY_ACTIONS.PAUSED;
};

export type ToggleFavoriteResponse = {
  action: typeof TOGGLE_ACTIONS.SAVED | typeof TOGGLE_ACTIONS.REMOVED;
};

export type PaginationOptions = {
  offset?: number;
  limit?: number;
};

export type MusicServiceSearchOptions = {
  pagination?: PaginationOptions;
};

export type FindMusicServiceTokensProps = {
  userId: string;
  provider: CLIENT_UNIQUE_PROVIDES;
};

export type CreateMusicServiceTokensData = {
  obtainDate: Date;
} & FindMusicServiceTokensProps;

export type User = FindMusicServiceTokensProps;

export type CreateConnectUrlOptions<T1 = unknown> = {
  userId: string;
  platform: CLIENT_UNIQUE_PROVIDES;
  service: MUSIC_SERVICE_PROVIDES;
} & T1;

export type MusicServiceContextOptions = {
  user: FindMusicServiceTokensProps;
  redirectUrl?: string;
};
