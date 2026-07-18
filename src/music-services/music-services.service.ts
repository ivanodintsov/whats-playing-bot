import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  AggregatorResponse,
  MusicServiceConnection,
  MusicServiceCoreService,
} from './music-service-core/music-service-core.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NoMusicServiceError } from 'src/errors';
import { Logger } from 'src/logger';
import {
  CurrentTrackResponse,
  ProfileResponse,
  ToggleFavoriteResponse,
  TogglePlayResponse,
  TrackResponse,
} from './music-service-core/types';
import { SpotifyService } from './spotify-service/spotify-service.service';
import {
  CLIENT_UNIQUE_PROVIDES,
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_NAMES_BY_PROVIDERS,
  MUSIC_SERVICE_PROVIDERS_BY_NAME,
  INTERNAL_MUSIC_SERVICE_PROVIDER,
} from 'src/constants';
import { MusicServiceToken } from './models/music-service-token.model';
import { InjectModel } from '@nestjs/sequelize';
import { User } from 'src/users/models/user.model';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { SoundcloudService } from './soundcloud-service/soundcloud-service.service';
import { InternalURIParser } from './music-services-uri-parser/internal-uri';
import { SongsService } from 'src/songs-info/songs/songs.service';
import {
  InternalURI,
  MusicServiceURI,
} from './music-services-uri-parser/types';
import { Link } from 'src/songs-info/models/link.model';
import { MusicServicesUriParserService } from './music-services-uri-parser/music-services-uri-parser.service';
import { TokensPoolService } from 'src/songs-info/tokens-pool/tokens-pool.service';
import { MusicServicePooledToken } from 'src/songs-info/tokens-pool/polled-token';
import { NoAvailableTokenException } from 'src/songs-info/tokens-pool/errors/NoAvailableTokenException';
import { MusicServicesConnectContext } from './types';

const MUSIC_SERVICES_ORDER_MAP = new Map([
  [MUSIC_SERVICE_PROVIDERS.SPOTIFY, 0],
  [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD, 1],
]);

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<MUSIC_SERVICE_PROVIDERS, MusicServiceCoreService>;
  protected readonly logger: Logger = new Logger(MusicServicesService.name);

  protected ctx: MusicServicesConnectContext;

  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly soundcloudService: SoundcloudService,
    protected readonly appConfig: ConfigService,
    protected readonly jwtService: JwtService,
    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
    @InjectModel(TelegramUser)
    private platformUser: typeof TelegramUser,
    private songsService: SongsService,
    private tokenPoolService: TokensPoolService,
  ) {
    super();

    this.services = {
      [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: spotifyService,
      [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD]: soundcloudService,
    };
  }

  public async getTrack({ id }: { id: string }): Promise<TrackResponse> {
    const track = await this.songsService.getTrackById(id);
    return track;
  }

  private async getAvalableTrackLinksOfUserConnectedServices({
    uri,
    services,
  }: {
    uri: MusicServiceURI | InternalURI;
    services: MusicServiceConnection[];
  }) {
    const musicServiceQuery = services.map(
      (service) => MUSIC_SERVICE_NAMES_BY_PROVIDERS[service.service.type],
    );
    let links: Link[] | null = null;

    if (uri.type === INTERNAL_MUSIC_SERVICE_PROVIDER) {
      links = await this.songsService.getLinksByTrackIdAndProviderNames(
        uri.uri.id,
        musicServiceQuery,
      );
    } else {
      links = await this.songsService.getLinksByProvider(
        {
          provider: MUSIC_SERVICE_NAMES_BY_PROVIDERS[uri.type],
          providerId: uri.uri.id,
        },
        musicServiceQuery,
      );
    }

    return links;
  }

  async playSong({
    uri,
  }: {
    uri: MusicServiceURI | InternalURI;
  }): Promise<void> {
    const musicSerivcesList = await this.getAllConnectedServices();
    const links = await this.getAvalableTrackLinksOfUserConnectedServices({
      uri,
      services: musicSerivcesList,
    });

    if (links) {
      await Promise.any(
        musicSerivcesList.map(async (connection) => {
          const link = links.find(
            (link) =>
              MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] ===
              connection.service.type,
          );
          await connection.using((service) =>
            service.playSong({
              uri: MusicServicesUriParserService.linkToUri(link),
            }),
          );
        }),
      );
    }
  }

  async getCurrentTrack(): Promise<AggregatorResponse<CurrentTrackResponse>> {
    const musicSerivcesList = await this.getAllConnectedServices();
    const responses: AggregatorResponse<CurrentTrackResponse> = [];
    let latestError: unknown;

    for (let i = 0; i < musicSerivcesList.length; i++) {
      try {
        const connection = musicSerivcesList[i];
        const response = await connection.using((service) =>
          service.getCurrentTrack(),
        );
        if (response) {
          responses.push({
            type: connection.service.type,
            response,
          });
        }
      } catch (error) {
        latestError = error;
      }
    }

    if (!responses.length && latestError) {
      throw latestError;
    }

    return responses;
  }

  async previousTrack(): Promise<void> {
    const connectionList = await this.getAllConnectedServices();

    return Promise.any(
      connectionList.map(async (connection) =>
        connection.using((service) => service.previousTrack()),
      ),
    );
  }

  async nextTrack(): Promise<void> {
    const connectionList = await this.getAllConnectedServices();

    return Promise.any(
      connectionList.map(async (connection) =>
        connection.using((service) => service.nextTrack()),
      ),
    );
  }

  async togglePlay(): Promise<TogglePlayResponse[]> {
    const connectionList = await this.getAllConnectedServices();
    const responses: TogglePlayResponse[] = [];
    let latestError: unknown;

    await Promise.any(
      connectionList.map(async (connection) => {
        try {
          const response = await connection.using((service) =>
            service.togglePlay(),
          );
          responses.push(response);
        } catch (error) {
          latestError = error;
        }
      }),
    );

    if (!responses.length && latestError) {
      throw latestError;
    }

    return responses;
  }

  async addToQueue({
    uri,
  }: {
    uri: MusicServiceURI | InternalURI;
  }): Promise<void> {
    const connectionList = await this.getAllConnectedServices();
    const links = await this.getAvalableTrackLinksOfUserConnectedServices({
      uri,
      services: connectionList,
    });

    if (links) {
      await Promise.any(
        connectionList.map(async (connection) => {
          const link = links.find(
            (link) =>
              MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] ===
              connection.service.type,
          );
          await connection.using((service) =>
            service.addToQueue({
              uri: MusicServicesUriParserService.linkToUri(link),
            }),
          );
        }),
      );
    }
  }

  async toggleFavorite({
    uris,
  }: {
    uris: [MusicServiceURI | InternalURI];
  }): Promise<AggregatorResponse<ToggleFavoriteResponse>> {
    const uri = uris[0];
    const responses: AggregatorResponse<ToggleFavoriteResponse> = [];
    let latestError: unknown;
    const connectionList = await this.getAllConnectedServices();
    const links = await this.getAvalableTrackLinksOfUserConnectedServices({
      uri,
      services: connectionList,
    });

    if (links) {
      await Promise.allSettled(
        connectionList.map(async (connection) => {
          try {
            const link = links.find(
              (link) =>
                MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] ===
                connection.service.type,
            );
            const response = await connection.using((service) =>
              service.toggleFavorite({
                uris: [MusicServicesUriParserService.linkToUri(link)],
              }),
            );
            responses.push({
              type: connection.service.type,
              response,
            });
          } catch (error) {
            latestError = error;
          }
        }),
      );
    }

    if (!responses.length && latestError) {
      throw latestError;
    }

    return responses;
  }

  async getProfile(): Promise<AggregatorResponse<ProfileResponse>> {
    const musicSerivcesList = await this.getAllConnectedServices();
    const responses: AggregatorResponse<ProfileResponse> = [];
    let error: Error;

    await Promise.allSettled(
      musicSerivcesList.map(async (connection) => {
        try {
          const response = await connection.service.getProfile();
          responses.push({
            type: connection.service.type,
            response,
          });
        } catch (error) {
          await connection.release();
          error = error;
        }
      }),
    );

    if (!responses.length) {
      throw error;
    }

    return responses;
  }

  logout(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  updateTokens(): Promise<MusicServicePooledToken> {
    throw new Error('Method not implemented.');
  }

  private async getServiceAuth(): Promise<MusicServiceConnection> {
    const services = Object.values(this.services);

    for (let i = 0; i < services.length; i++) {
      try {
        const token = await this.tokenPoolService.acquireByUser({
          service: services[i].type,
          userId: this.ctx.userId,
          provider: this.ctx.provider,
        });

        try {
          const service = await services[i].connect({
            token,
          });
          return service;
        } catch (error) {
          await token.release();

          if (error instanceof NoAvailableTokenException) {
            throw new NoMusicServiceError();
          }

          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.debug(error.message, error.stack);
        } else {
          this.logger.debug(error);
        }
      }
    }

    throw new NoMusicServiceError();
  }

  async getService() {
    const service = await this.getServiceAuth();
    return service;
  }

  async connect(
    type: MUSIC_SERVICE_PROVIDERS | (typeof InternalURIParser)['type'],
    ctx: MusicServicesConnectContext,
  ): Promise<
    MusicServiceConnection<MusicServiceCoreService | MusicServicesService>
  > {
    if (type === INTERNAL_MUSIC_SERVICE_PROVIDER) {
      const service = await this.connectToInternal(ctx);

      const connection: MusicServiceConnection<MusicServicesService> = {
        service,
        release: async () => {},
        using: async (callback) => {
          try {
            return await callback(service);
          } finally {
            await connection.release();
          }
        },
      };

      return connection;
    }

    try {
      const pooledToken = await this.tokenPoolService.acquireByUser({
        userId: ctx.userId,
        provider: ctx.provider,
        service: type,
      });

      const service = await this.services[type].connect({
        token: pooledToken,
      });

      return service;
    } catch (error) {
      if (error instanceof NoAvailableTokenException) {
        throw new NoMusicServiceError();
      }

      throw error;
    }
  }

  async connectToInternal(ctx: MusicServicesConnectContext) {
    const musicServicesService = new MusicServicesService(
      this.spotifyService,
      this.soundcloudService,
      this.appConfig,
      this.jwtService,
      this.musicServiceTokenModel,
      this.platformUser,
      this.songsService,
      this.tokenPoolService,
    );

    musicServicesService.ctx = ctx;

    return musicServicesService;
  }

  async getTokens({
    user,
    musicServiceType,
    provider,
  }: {
    musicServiceType: MUSIC_SERVICE_PROVIDERS;
    provider: CLIENT_UNIQUE_PROVIDES;
    user: User;
  }) {
    const platformUser = await this.platformUser.findOne({
      where: {
        userId: user.id,
        // TODO
        // provider: provider
      },
      attributes: ['id'],
    });

    const connection = await this.connect(musicServiceType, {
      userId: platformUser.id,
      provider,
    });

    const tokens = await connection.using(async (service) => {
      const pooledToken = await service.updateTokens();
      return pooledToken.getFreshToken();
    });

    return tokens;
  }

  async getAllConnectedServices() {
    const tokenList = await this.tokenPoolService.acquireTokensByUser({
      userId: this.ctx.userId,
      provider: this.ctx.provider,
    });

    const promises = tokenList.map(async (pooledToken) => {
      return this.services[pooledToken.tokenService].connect({
        token: pooledToken,
      });
    });

    const connectedServices = (await Promise.allSettled(promises))
      .filter((service) => service.status !== 'rejected')
      .map((service) => service.value)
      .sort(
        (service1, service2) =>
          (MUSIC_SERVICES_ORDER_MAP.get(service1.service.type) ?? Infinity) -
          (MUSIC_SERVICES_ORDER_MAP.get(service2.service.type) ?? Infinity),
      );

    return connectedServices;
  }

  async getAllConnectedServiceTypes() {
    const tokenList = await this.musicServiceTokenModel.findAll({
      where: {
        userId: this.ctx.userId,
        provider: this.ctx.provider,
      },
    });

    const serviceTypes = tokenList
      .sort(
        (tokens1, tokens2) =>
          (MUSIC_SERVICES_ORDER_MAP.get(tokens1.service) ?? Infinity) -
          (MUSIC_SERVICES_ORDER_MAP.get(tokens2.service) ?? Infinity),
      )
      .map((tokens) => this.services[tokens.service].type);

    return serviceTypes;
  }
}
