import {
  MusicServiceToken,
  MusicServiceTokenDomain,
} from '../models/music-service-token.model';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Message } from 'src/bot-core/message/message';
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
import { MUSIC_SERVICE_PROVIDES } from 'src/constants';
import { MusicServiceURI } from '../music-services-uri-parser/types';

export abstract class AbstractMusicServiceMethods {
  abstract createLoginUrl(): Promise<string>;
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
    data: Pick<
      CreateMusicServiceTokensData,
      'obtainDate' | 'userId' | 'provider'
    >,
  ): Promise<MusicServiceToken>;
  abstract updateTokens(
    data: FindMusicServiceTokensProps,
  ): Promise<MusicServiceTokenDomain>;
  abstract removeTokens(data: FindMusicServiceTokensProps): Promise<void>;
  abstract getCurrentTrack(): Promise<CurrentTrackResponse>;
  abstract getTrack(data: { id: any }): Promise<TrackResponse>;
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

  abstract previousTrack(): Promise<void>;
  abstract nextTrack(): Promise<void>;
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

export abstract class AbstractMusicServices {
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly jwtService: JwtService;
  protected abstract readonly logger: LoggerService;

  services: Record<MUSIC_SERVICE_PROVIDES, MusicServiceCoreService>;

  createPlatformConnectURL(options: CreateConnectUrlOptions) {
    const site = this.appConfig.get<string>('CONNECT_SERVICE_URL');
    const token = this.jwtService.sign(options);
    return `${site}/music-services/connect?t=${token}`;
  }

  async isUserHasConnectedService(ctx: MusicServiceContextOptions) {
    const services = Object.values(this.services);

    for (let index = 0; index < services.length; index++) {
      const service = services[index];
      try {
        const tokens = await service.getTokens(ctx.user);

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
  abstract type: MUSIC_SERVICE_PROVIDES;
  abstract serviceName: string;
  abstract connect(
    ctx: MusicServiceContextOptions,
  ): Promise<MusicServiceCoreService>;
}
