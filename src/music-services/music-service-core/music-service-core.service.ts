import { TrackEntity } from 'src/domain/Track';
import { PLAY_ACTIONS, TOGGLE_ACTIONS } from './constants';

type TOKENS = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

type TelegramUser = {
  tg_id: number;
};

type DiscordUser = {
  discord_id: string;
};

export type User = TelegramUser | DiscordUser;

type TrackResponse = {
  data: TrackEntity;
  response: any;
};

export type PaginationOptions = {
  offset?: number;
  limit?: number;
};

export type SearchOptions = {
  pagination?: PaginationOptions;
};

export abstract class AbstractMusicServiceBasic {
  abstract createLoginUrl(redirectUri?: string): Promise<string>;

  abstract saveTokens(data): Promise<TOKENS>;

  abstract getTokens(data): Promise<TOKENS>;

  abstract createAndSaveTokens(
    query: any,
    user: User,
    redirectUri?: string,
  ): Promise<TOKENS>;

  abstract getCurrentTrack({ user }: { user: User }): Promise<TrackResponse>;

  abstract getTrack({
    user,
    id,
  }: {
    user: User;
    id: any;
  }): Promise<TrackResponse>;

  abstract previousTrack(user: User): Promise<void>;

  abstract nextTrack(user: User): Promise<void>;

  abstract toggleFavorite({
    trackIds,
    user,
  }: {
    trackIds: [string];
    user: User;
  }): Promise<{
    response: any;
    action: typeof TOGGLE_ACTIONS.SAVED | typeof TOGGLE_ACTIONS.REMOVED;
  }>;

  abstract togglePlay(
    user: User,
  ): Promise<{
    action: typeof PLAY_ACTIONS.PLAYING | typeof PLAY_ACTIONS.PAUSED;
  }>;

  abstract playSong({ user, uri }: { user: User; uri: string }): Promise<void>;

  abstract addToQueue({
    user,
    uri,
  }: {
    user: User;
    uri: string;
  }): Promise<void>;

  abstract getProfile(
    user: User,
  ): Promise<{
    response: any;
    data: {
      name: string;
      url: string;
    };
  }>;

  abstract searchTracks({
    user,
    search,
    options,
  }: {
    user: User;
    search: string;
    options?: SearchOptions;
  }): Promise<{
    data: TrackEntity[];
    response: any;
    pagination: {
      offset: string;
      next: string;
    };
  }>;

  abstract remove(user: User): Promise<any>;
}

export abstract class MusicServiceCoreService extends AbstractMusicServiceBasic {
  abstract type: string;
  protected abstract updateTokens(data): Promise<TOKENS>;
}
