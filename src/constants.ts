export const staticPrefix = '/static';

export enum CLIENT_PROVIDES {
  TELEGRAM,
  TELEGRAM_2,
}

export type TELEGRAM_CLIENT_PROVIDERS =
  | CLIENT_PROVIDES.TELEGRAM
  | CLIENT_PROVIDES.TELEGRAM_2;

export enum CLIENT_UNIQUE_PROVIDES {
  TELEGRAM,
}

export enum MUSIC_SERVICE_PROVIDERS {
  SPOTIFY,
  SOUNDCLOUD,
}

export enum MUSIC_SERVICE_PROVIDER_NAMES {
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
}

export const MUSIC_SERVICE_NAMES_BY_PROVIDERS: Record<
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDER_NAMES
> = {
  [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
  [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD]: MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
} as const;
export const MUSIC_SERVICE_PROVIDERS_BY_NAME: Record<
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS
> = {
  [MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY]: MUSIC_SERVICE_PROVIDERS.SPOTIFY,
  [MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD]: MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD,
} as const;

export const INTERNAL_MUSIC_SERVICE_PROVIDER = 'INTERNAL' as const;
export type INTERNAL_MUSIC_SERVICE_PROVIDER =
  typeof INTERNAL_MUSIC_SERVICE_PROVIDER;

export const INTERNAL_MUSIC_SERVICE_NAME = 'itrn' as const;
export type INTERNAL_MUSIC_SERVICE_NAME = typeof INTERNAL_MUSIC_SERVICE_NAME;

export const MusicServiceConfig: Record<
  | MUSIC_SERVICE_PROVIDER_NAMES
  | 'itunes'
  | 'youtubeMusic'
  | 'youtube'
  | 'tidal'
  | 'itunesStore'
  | 'lineMusic',
  {
    name: string;
    color: string;
    deepLink?: string;
  }
> = {
  spotify: {
    color: '#1feb6a',
    name: 'Spotify',
  },
  soundcloud: {
    color: '#FF5500',
    name: 'SoundCloud',
  },
  itunes: {
    name: 'Apple Music',
    color: '#fa57c1',
    deepLink: 'music://',
  },
  youtubeMusic: {
    name: 'Youtube Music',
    color: '#ff0000',
    deepLink: 'youtubemusic://',
  },
  youtube: {
    name: 'Youtube',
    color: '#ff0000',
    deepLink: 'vnd.youtube://',
  },
  tidal: {
    name: 'Tidal',
    color: '#000000',
    deepLink: 'tidal://',
  },
  itunesStore: {
    name: 'iTunes Store',
    color: '#fa57c1',
  },
  lineMusic: {
    name: 'Line Music',
    color: '#0ee071',
  },
};

export enum THROTTLERS {
  ANONYMOUS = 'ANONYMOUS',
  AUTHENTICATED = 'AUTHENTICATED',
}
