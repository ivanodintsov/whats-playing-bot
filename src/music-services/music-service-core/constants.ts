import { PaginationOptions } from './types';

export const TOGGLE_ACTIONS = {
  REMOVED: 'removed',
  SAVED: 'saved',
};

export const PLAY_ACTIONS = {
  PLAYING: 'playing',
  PAUSED: 'paused',
};

export const MUSIC_SERVICE_QUEUE = 'MUSIC_SERVICE_QUEUE';
export const NO_ALBUM = 'NO_ALBUM' as const;
export const NO_ARTIST = 'NO_ARTIST' as const;

export const PAGINATION_DEFAULTS: PaginationOptions = {
  offset: '0',
  limit: '10',
};
