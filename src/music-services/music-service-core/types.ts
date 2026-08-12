import { Maybe } from 'src/typings';
import {
  CLIENT_PROVIDES,
  CLIENT_UNIQUE_PROVIDES,
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDER_NAMES,
} from 'src/constants';
import { NO_ALBUM, PLAY_ACTIONS, TOGGLE_ACTIONS } from './constants';
import { MusicServiceTokenData } from '../models/music-service-token.model';
import { MusicServicePooledToken } from 'src/songs-info/tokens-pool/polled-token';

export type MusicServiceProvider =
  | MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY
  | MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD
  | 'itunes'
  | 'itunesStore'
  | 'youtubeMusic'
  | 'youtube';

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

export enum LINK_TYPE {
  TRACK,
  ALBUM,
  ARTIST,
}

export type IExternalUrl = {
  artistId?: Maybe<string>;
  albumId?: Maybe<string>;
  trackId?: Maybe<string>;

  providerUrl: string;
  providerId: Maybe<string>;
  provider: MusicServiceProvider;
  // | string;

  type: LINK_TYPE;
};

export type IExternalUrls = [IExternalUrl] | IExternalUrl[];

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
  id?: string | typeof NO_ALBUM;
  name: string | typeof NO_ALBUM;
  links: Maybe<IExternalUrls>;
  genres: Maybe<IGenre[]>;
  image: Maybe<IImage>;
  socials?: Maybe<ArtistSocialDomain[]>;
}

export interface IGenre {
  slug: string;
  name?: string;
}

export interface ITrack {
  id?: string;
  oldId?: string;
  name: string;
  type: SONG_TYPE;
  trackNumber: Maybe<number>;
  links: IExternalUrls;
  explicit: Maybe<boolean>;
  duration: Maybe<number>;

  album: Maybe<IAlbum>;
  artists: Maybe<IArtist[]>;
  artist?: Maybe<IArtist>;
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
  tracks: ITrack[];
} & Pagination;

export type SearchResponseRaw<T> = {
  tracks: T[];
} & Pagination;

export type CurrentTrackResponse = ITrack;
export type TrackResponse = ITrack;
export type FullTrackResponse = ITrack;
export type ArtistResponse = IArtist;
export type AlbumResponse = IAlbum;
export type ArtistAlbumsResponse = PaginatedResponse<IAlbum>;
export type AlbumTracksResponse = PaginatedResponse<ITrack>;

export type ProfileResponse = {
  id: string;
  username: Maybe<string>;
  uri: Maybe<string>;
  url: string;
};

export type TogglePlayResponse = {
  action: typeof PLAY_ACTIONS.PLAYING | typeof PLAY_ACTIONS.PAUSED;
};

export type ToggleFavoriteResponse = {
  action: typeof TOGGLE_ACTIONS.SAVED | typeof TOGGLE_ACTIONS.REMOVED;
};

export type PaginationOptions = {
  offset?: string;
  limit?: string;
  next?: string;
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
} & Omit<MusicServiceTokenData, 'id' | 'expires_date' | 'service'>;

export type User = FindMusicServiceTokensProps;

export type CreateConnectUrlOptions<T1 = unknown> = {
  userId: string;
  platform: CLIENT_UNIQUE_PROVIDES;
  platformInstance: CLIENT_PROVIDES;
  service: MUSIC_SERVICE_PROVIDERS;
} & T1;

export type MusicServiceContextOptions = {
  // user: FindMusicServiceTokensProps;
  redirectUrl?: string;
  token: MusicServicePooledToken;
};
