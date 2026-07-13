import { MUSIC_SERVICE_PROVIDER_NAMES } from 'src/constants';
import { Provider } from './types';

export const SERVICES_PROVIDERS: Record<Provider, Provider> = {
  [MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY]: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
  itunes: 'itunes',
  itunesStore: 'itunesStore',
  youtube: 'youtube',
  youtubeMusic: 'youtubeMusic',
  [MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD]:
    MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
};

export const WAIT_TIME_BETWEEN_PARSES = 1000;
