import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  MusicServiceCoreService,
} from './music-service-core/music-service-core.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NoMusicServiceError } from 'src/errors';
import { Logger } from 'src/logger';
import { MusicServiceContextOptions } from './music-service-core/types';
import { SpotifyService } from './spotify-service/spotify-service.service';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { MusicServiceToken } from './models/music-service-token.model';
import { InjectModel } from '@nestjs/sequelize';
import { User } from 'src/users/models/user.model';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<MUSIC_SERVICE_PROVIDERS, MusicServiceCoreService>;
  protected readonly logger: Logger;

  constructor(
    private readonly spotifyService: SpotifyService,
    // private readonly deezerService: DeezerServiceService,
    protected readonly appConfig: ConfigService,
    protected readonly jwtService: JwtService,
    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
    @InjectModel(TelegramUser)
    private platformUser: typeof TelegramUser,
  ) {
    super();

    this.services = {
      [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: spotifyService,
      // [deezerService.type]: deezerService,
    };
  }

  private async getServiceAuth(ctx: MusicServiceContextOptions) {
    const services = Object.values(this.services);

    for (let i = 0; i < services.length; i++) {
      try {
        const service = await services[i].connect(ctx);
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

  async getService(ctx: MusicServiceContextOptions) {
    const service = await this.getServiceAuth(ctx);
    return service;
  }

  async connect(
    type: MUSIC_SERVICE_PROVIDERS,
    ctx: MusicServiceContextOptions,
  ) {
    const service = await this.services[type].connect(ctx);
    return service;
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

  async getAllConnectedServices(ctx: MusicServiceContextOptions) {
    const tokensList = await this.musicServiceTokenModel.findAll({
      where: { ...ctx.user },
    });

    const promises = tokensList.map((tokens) =>
      this.services[tokens.service].connect({
        ...ctx,
        tokens,
      }),
    );

    const connectedServices = (await Promise.allSettled(promises))
      .filter((service) => service.status !== 'rejected')
      .map((service) => service.value);

    return connectedServices;
  }

  async getAllConnectedServiceTypes(ctx: MusicServiceContextOptions) {
    const tokensList = await this.musicServiceTokenModel.findAll({
      where: { ...ctx.user },
    });

    const serviceTypes = tokensList.map(
      (tokens) => this.services[tokens.service].type,
    );

    return serviceTypes;
  }
}
