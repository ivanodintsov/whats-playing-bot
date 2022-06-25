import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Message } from 'src/bot-core/message/message';
import { TrackEntity } from 'src/domain/Track';
import { PLAY_ACTIONS, TOGGLE_ACTIONS } from './constants';

type TOKENS = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export interface TelegramUser {
  tg_id: number;
}

export interface DiscordUser {
  discord_id: string;
}

export type User = TelegramUser | DiscordUser;

export type TrackResponse = {
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

export abstract class AbstractMusicServiceMethods {
  abstract createLoginUrl(data?: { redirectUri?: string }): Promise<string>;

  abstract saveTokens(data): Promise<TOKENS>;

  abstract getTokens(data: { user: User }): Promise<TOKENS>;

  abstract createAndSaveTokens(data: {
    query: any;
    user: User;
    redirectUri?: string;
  }): Promise<TOKENS>;

  abstract getCurrentTrack(data: {
    user: User;
  }): Promise<TrackResponse | TrackResponse[]>;

  abstract getTrack(data: { user: User; id: any }): Promise<TrackResponse>;

  abstract previousTrack(data: { user: User }): Promise<void>;

  abstract nextTrack(data: { user: User }): Promise<void>;

  abstract toggleFavorite(data: {
    trackIds: [string];
    user: User;
  }): Promise<{
    response: any;
    action: typeof TOGGLE_ACTIONS.SAVED | typeof TOGGLE_ACTIONS.REMOVED;
  }>;

  abstract togglePlay(data: {
    user: User;
  }): Promise<{
    action: typeof PLAY_ACTIONS.PLAYING | typeof PLAY_ACTIONS.PAUSED;
  }>;

  abstract playSong(data: { user: User; uri: string }): Promise<void>;

  abstract addToQueue(data: { user: User; uri: string }): Promise<void>;

  abstract getProfile(data: {
    user: User;
  }): Promise<{
    response: any;
    data: {
      name: string;
      url: string;
    };
  }>;

  abstract searchTracks(data: {
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

  abstract remove(data: { user: User }): Promise<any>;
}

export abstract class AbstractMusicServices extends AbstractMusicServiceMethods {
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly jwtService: JwtService;

  services: Record<string, MusicServiceCoreService>;

  createMessengerConnectURL(
    message: Message,
    service: MusicServiceCoreService,
  ) {
    const site = this.appConfig.get<string>('SITE');

    const token = this.jwtService.sign({
      messenger: message.messengerType,
      service: service.type,
      fromId: message.from.id,
      chatId: message.chat.id,
    });

    return `${site}/music-services/connect?t=${token}`;
  }
}

export abstract class MusicServiceCoreService extends AbstractMusicServiceMethods {
  abstract type: string;
  protected abstract updateTokens(data: { user: User }): Promise<TOKENS>;
}
