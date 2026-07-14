import { MusicServiceToken } from '../models/music-service-token.model';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AlbumResponse,
  AlbumTracksResponse,
  ArtistAlbumsResponse,
  ArtistResponse,
  CurrentTrackResponse,
  FindMusicServiceTokensProps,
  FullTrackResponse,
  MusicServiceSearchOptions,
  CreateMusicServiceTokensData,
  TrackResponse,
  SearchResponse,
  ToggleFavoriteResponse,
  TogglePlayResponse,
  ProfileResponse,
  CreateConnectUrlOptions,
  MusicServiceContextOptions,
} from './types';
import {
  MUSIC_SERVICE_PROVIDERS,
  INTERNAL_MUSIC_SERVICE_PROVIDER,
} from 'src/constants';
import {
  InternalURI,
  MusicServiceURI,
} from '../music-services-uri-parser/types';
import { MusicServicePooledToken } from 'src/songs-info/tokens-pool/polled-token';
import { MusicServicesConnectContext } from '../types';

export abstract class AbstractMusicServiceBasicMethods {
  abstract getTrack(data: { id: any }): Promise<TrackResponse>;
  abstract removeTokens(): Promise<void>;
  abstract updateTokens(): Promise<MusicServicePooledToken>;
  abstract previousTrack(): Promise<void>;
  abstract nextTrack(): Promise<void>;
}

export abstract class AbstractMusicServiceMethods extends AbstractMusicServiceBasicMethods {
  abstract createLoginUrl(): Promise<{
    url: string;
    rest: any;
  }>;
  abstract saveTokens(
    data: CreateMusicServiceTokensData,
  ): Promise<MusicServiceToken>;
  abstract createTokens(
    data: CreateMusicServiceTokensData & {
      expires_date: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<MusicServiceToken>;
  abstract getTokens(
    data: FindMusicServiceTokensProps,
  ): Promise<MusicServiceToken>;
  abstract createAndSaveTokens(
    query: any,
    rest: any,
    data: Pick<
      CreateMusicServiceTokensData,
      'obtainDate' | 'userId' | 'provider'
    >,
  ): Promise<MusicServiceToken>;
  abstract getCurrentTrack(): Promise<CurrentTrackResponse>;
  abstract getFullTrack(data: { id: any }): Promise<FullTrackResponse>;
  abstract getAlbum(data: { id: any }): Promise<AlbumResponse>;
  abstract getArtist(data: { id: any }): Promise<ArtistResponse>;
  abstract getArtistAlbums(data: {
    id: any;
    options?: MusicServiceSearchOptions;
  }): Promise<ArtistAlbumsResponse>;

  abstract getAlbumTracks(data: {
    id: any;
    options?: MusicServiceSearchOptions;
  }): Promise<AlbumTracksResponse>;
  abstract toggleFavorite({
    uris,
  }: {
    uris: [MusicServiceURI];
  }): Promise<ToggleFavoriteResponse>;
  abstract togglePlay(): Promise<TogglePlayResponse>;
  abstract playSong(data: { uri: MusicServiceURI }): Promise<void>;
  abstract addToQueue(data: { uri: MusicServiceURI }): Promise<void>;
  abstract getProfile(): Promise<ProfileResponse>;
  abstract searchTracks(data: {
    search: string;
    options?: MusicServiceSearchOptions;
  }): Promise<SearchResponse>;
}

export type AggregatorResponse<T> = {
  type: MUSIC_SERVICE_PROVIDERS;
  response: T;
}[];

export abstract class AbstractMusicServices extends AbstractMusicServiceBasicMethods {
  type: INTERNAL_MUSIC_SERVICE_PROVIDER = INTERNAL_MUSIC_SERVICE_PROVIDER;
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly jwtService: JwtService;
  protected abstract readonly logger: LoggerService;

  services: Record<MUSIC_SERVICE_PROVIDERS, MusicServiceCoreService>;

  abstract playSong(data: {
    uri: MusicServiceURI | InternalURI;
  }): Promise<void>;
  abstract getCurrentTrack(): Promise<AggregatorResponse<CurrentTrackResponse>>;
  abstract togglePlay(): Promise<TogglePlayResponse[]>;
  abstract toggleFavorite({
    uris,
  }: {
    uris: [MusicServiceURI | InternalURI];
  }): Promise<AggregatorResponse<ToggleFavoriteResponse>>;
  abstract getProfile(): Promise<AggregatorResponse<ProfileResponse>>;
  abstract addToQueue(data: {
    uri: MusicServiceURI | InternalURI;
  }): Promise<void>;

  createPlatformConnectURL(options: CreateConnectUrlOptions) {
    const site = this.appConfig.get<string>('CONNECT_SERVICE_URL');
    const token = this.jwtService.sign(options);
    return `${site}/music-services/connect?t=${token}`;
  }

  async isUserHasConnectedService(ctx: MusicServicesConnectContext) {
    const services = Object.values(this.services);

    for (let index = 0; index < services.length; index++) {
      const service = services[index];
      try {
        const tokens = await service.getTokens({
          userId: ctx.userId,
          provider: ctx.provider,
        });

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

export type MusicServiceConnection<TService = MusicServiceCoreService> = {
  service: TService;
  release: () => Promise<void>;
  using<T>(callback: (service: TService) => Promise<T>): Promise<T>;
};

export abstract class MusicServiceCoreService extends AbstractMusicServiceMethods {
  abstract type: MUSIC_SERVICE_PROVIDERS;
  abstract serviceName: string;
  abstract connect(
    ctx: MusicServiceContextOptions,
  ): Promise<MusicServiceConnection<MusicServiceCoreService>>;
}
