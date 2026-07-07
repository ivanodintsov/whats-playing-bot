import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  MusicServiceCoreService,
} from './music-service-core/music-service-core.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NoMusicServiceError } from 'src/errors';
import { Logger } from 'src/logger';
import {
  FindMusicServiceTokensProps,
  MusicServiceContextOptions,
} from './music-service-core/types';
import { SpotifyService } from './spotify-service/spotify-service.service';
import { MUSIC_SERVICE_PROVIDES } from 'src/constants';

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<MUSIC_SERVICE_PROVIDES, MusicServiceCoreService>;
  protected readonly logger: Logger;

  constructor(
    private readonly spotifyService: SpotifyService,
    // private readonly deezerService: DeezerServiceService,
    protected readonly appConfig: ConfigService,
    protected readonly jwtService: JwtService,
  ) {
    super();

    this.services = {
      [MUSIC_SERVICE_PROVIDES.SPOTIFY]: spotifyService,
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
        this.logger.error(error);
      }
    }

    throw new NoMusicServiceError();
  }

  async getService(ctx: MusicServiceContextOptions) {
    const service = await this.getServiceAuth(ctx);
    return service;
  }

  async connect(type: MUSIC_SERVICE_PROVIDES, ctx: MusicServiceContextOptions) {
    const service = await this.services[type].connect(ctx);
    return service;
  }
}
