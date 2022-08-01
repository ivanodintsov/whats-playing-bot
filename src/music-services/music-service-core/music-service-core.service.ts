import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Message } from 'src/bot-core/message/message';
import { TrackEntity } from 'src/domain/Track';
import { IAlbum, IArtist, ISong, ISongSimple } from 'src/songs/types/types';
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

export type BasicResponseData = {
  type: string;
};

export type TrackResponse = BasicResponseData & {
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
  abstract createLoginUrl(data?: {
    user: User;
    redirectUri?: string;
  }): Promise<string>;

  abstract saveTokens(data): Promise<TOKENS>;

  abstract getTokens(data: { user: User }): Promise<TOKENS>;

  abstract createAndSaveTokens(data: {
    query: any;
    user: User;
    redirectUri?: string;
  }): Promise<TOKENS>;

  abstract getCurrentTrack(data: { user: User }): Promise<TrackResponse>;

  abstract getTrack(data: { user: User; id: any }): Promise<TrackResponse>;

  abstract previousTrack(data: { user: User }): Promise<BasicResponseData>;

  abstract nextTrack(data: { user: User }): Promise<BasicResponseData>;

  abstract toggleFavorite(data: {
    trackIds: [string];
    user: User;
  }): Promise<
    BasicResponseData & {
      response: any;
      action: typeof TOGGLE_ACTIONS.SAVED | typeof TOGGLE_ACTIONS.REMOVED;
    }
  >;

  abstract togglePlay(data: {
    user: User;
  }): Promise<
    BasicResponseData & {
      action: typeof PLAY_ACTIONS.PLAYING | typeof PLAY_ACTIONS.PAUSED;
    }
  >;

  abstract playSong(data: {
    user: User;
    uri: string;
  }): Promise<BasicResponseData>;

  abstract addToQueue(data: {
    user: User;
    uri: string;
  }): Promise<BasicResponseData>;

  abstract getProfile(data: {
    user: User;
  }): Promise<
    BasicResponseData & {
      response: any;
      data: {
        name: string;
        url: string;
      };
    }
  >;

  abstract searchTracks(data: {
    user: User;
    search: string;
    options?: SearchOptions;
  }): Promise<
    BasicResponseData & {
      data: TrackEntity[];
      response: any;
      pagination: {
        offset: string;
        next: string;
      };
    }
  >;

  abstract remove(data: { user: User }): Promise<BasicResponseData>;
}

export abstract class AbstractMusicServices extends AbstractMusicServiceMethods {
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly jwtService: JwtService;
  protected abstract readonly logger: LoggerService;

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

  async isUserHasConnectedService(data: { user: User }) {
    const services = Object.values(this.services);

    for (let index = 0; index < services.length; index++) {
      const service = services[index];
      try {
        const tokens = await service.getTokens(data);

        if (!tokens) {
          continue;
        }

        return tokens;
      } catch (error) {
        this.logger.error(error);
      }
    }

    return false;
  }
}

export abstract class MusicServiceCoreService extends AbstractMusicServiceMethods {
  abstract type: string;
  abstract serviceName: string;

  protected abstract updateTokens(data: { user: User }): Promise<TOKENS>;

  abstract searchTrack(data: {
    search: {
      artist?: string;
      track?: string;
      album?: string;
      year?: string | number;
    };
    isrc: string;
    type: 'album' | 'artist' | 'track';
  }): Promise<
    BasicResponseData & {
      data: {
        song: ISongSimple;
        artists: IArtist[];
        album: IAlbum;
      };
      response: any;
    }
  >;
}
