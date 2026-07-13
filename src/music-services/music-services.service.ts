import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  AggregatorResponse,
  MusicServiceCoreService,
} from './music-service-core/music-service-core.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NoMusicServiceError } from 'src/errors';
import { Logger } from 'src/logger';
import {
  CurrentTrackResponse,
  MusicServiceContextOptions,
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
import {
  MusicServiceToken,
  MusicServiceTokenDomain,
} from './models/music-service-token.model';
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

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<MUSIC_SERVICE_PROVIDERS, MusicServiceCoreService>;
  protected readonly logger: Logger = new Logger(MusicServicesService.name);
  private ctx: MusicServiceContextOptions;

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
  ) {
    super();

    this.services = {
      [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: spotifyService,
      [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD]: soundcloudService,
    };
  }

  public async getTrack({ id }: { id: any }): Promise<TrackResponse> {
    const track = await this.songsService.getTrackById(id);
    return track;
  }

  private async getAvalableTrackLinksOfUserConnectedServices({
    uri,
    services,
  }: {
    uri: MusicServiceURI | InternalURI;
    services: MusicServiceCoreService[];
  }) {
    const musicServiceQuery = services.map(
      (service) => MUSIC_SERVICE_NAMES_BY_PROVIDERS[service.type],
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
        musicSerivcesList.map(async (service) => {
          const link = links.find(
            (link) =>
              MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] === service.type,
          );
          await service.playSong({
            uri: MusicServicesUriParserService.linkToUri(link),
          });
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
        const service = musicSerivcesList[i];
        const response = await service.getCurrentTrack();
        if (response) {
          responses.push({
            type: service.type,
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
    const musicSerivcesList = await this.getAllConnectedServices();

    return Promise.any(
      musicSerivcesList.map(async (service) => service.previousTrack()),
    );
  }

  async nextTrack(): Promise<void> {
    const musicSerivcesList = await this.getAllConnectedServices();

    return Promise.any(
      musicSerivcesList.map(async (service) => service.nextTrack()),
    );
  }

  async togglePlay(): Promise<TogglePlayResponse[]> {
    const musicSerivcesList = await this.getAllConnectedServices();
    const responses: TogglePlayResponse[] = [];
    let latestError: unknown;

    await Promise.any(
      musicSerivcesList.map(async (service) => {
        try {
          const response = await service.togglePlay();
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
    const musicSerivcesList = await this.getAllConnectedServices();
    const links = await this.getAvalableTrackLinksOfUserConnectedServices({
      uri,
      services: musicSerivcesList,
    });

    if (links) {
      await Promise.any(
        musicSerivcesList.map(async (service) => {
          const link = links.find(
            (link) =>
              MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] === service.type,
          );
          await service.addToQueue({
            uri: MusicServicesUriParserService.linkToUri(link),
          });
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
    const musicSerivcesList = await this.getAllConnectedServices();
    const links = await this.getAvalableTrackLinksOfUserConnectedServices({
      uri,
      services: musicSerivcesList,
    });

    if (links) {
      await Promise.allSettled(
        musicSerivcesList.map(async (service) => {
          try {
            const link = links.find(
              (link) =>
                MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider] === service.type,
            );
            const response = await service.toggleFavorite({
              uris: [MusicServicesUriParserService.linkToUri(link)],
            });
            responses.push({
              type: service.type,
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
      musicSerivcesList.map(async (service) => {
        try {
          const response = await service.getProfile();
          responses.push({
            type: service.type,
            response,
          });
        } catch (error) {
          error = error;
        }
      }),
    );

    if (!responses.length) {
      throw error;
    }

    return responses;
  }

  removeTokens(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  updateTokens(): Promise<MusicServiceTokenDomain> {
    throw new Error('Method not implemented.');
  }

  private async getServiceAuth() {
    const services = Object.values(this.services);

    for (let i = 0; i < services.length; i++) {
      try {
        const service = await services[i].connect(this.ctx);
        return service;
      } catch (error) {
        if (!(error instanceof NoMusicServiceError)) {
          this.logger.error(error);
          throw error;
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
    ctx: MusicServiceContextOptions,
  ) {
    if (type === INTERNAL_MUSIC_SERVICE_PROVIDER) {
      return this.connectToInternal(ctx);
    }

    const service = await this.services[type].connect(ctx);
    return service;
  }

  async connectToInternal(ctx: MusicServiceContextOptions) {
    const musicServicesService = new MusicServicesService(
      this.spotifyService,
      this.soundcloudService,
      this.appConfig,
      this.jwtService,
      this.musicServiceTokenModel,
      this.platformUser,
      this.songsService,
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

    const service = await this.connect(musicServiceType, {
      user: {
        userId: platformUser.id,
        provider,
      },
    });

    const tokens = await service.updateTokens();

    return tokens;
  }

  async getAllConnectedServices() {
    const tokensList = await this.musicServiceTokenModel.findAll({
      where: { ...this.ctx.user },
    });

    const promises = tokensList.map((tokens) =>
      this.services[tokens.service].connect({
        ...this.ctx,
        tokens,
      }),
    );

    const connectedServices = (await Promise.allSettled(promises))
      .filter((service) => service.status !== 'rejected')
      .map((service) => service.value);

    return connectedServices;
  }

  async getAllConnectedServiceTypes() {
    const tokensList = await this.musicServiceTokenModel.findAll({
      where: { ...this.ctx.user },
    });

    const serviceTypes = tokensList.map(
      (tokens) => this.services[tokens.service].type,
    );

    return serviceTypes;
  }
}
