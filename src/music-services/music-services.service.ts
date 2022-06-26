import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  MusicServiceCoreService,
  TrackResponse,
  User,
} from './music-service-core/music-service-core.service';
import { SpotifyServiceService } from './spotify-service/spotify-service.service';
import { DeezerServiceService } from './deezer-service/deezer-service.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NoMusicServiceError } from 'src/errors';
import { Logger } from 'src/logger';

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<string, MusicServiceCoreService>;
  protected readonly logger: Logger;

  constructor(
    private readonly spotifyService: SpotifyServiceService,
    private readonly deezerService: DeezerServiceService,
    protected readonly appConfig: ConfigService,
    protected readonly jwtService: JwtService,
  ) {
    super();

    this.services = {
      [spotifyService.type]: spotifyService,
      [deezerService.type]: deezerService,
    };
  }

  private async getServiceAuth({ user }: { user: User }) {
    const services = Object.values(this.services);

    for (let i = 0; i < services.length; i++) {
      const service = services[i];

      try {
        const tokens = await service.getTokens({ user });

        if (!tokens) {
          continue;
        }

        return service;
      } catch (error) {
        this.logger.error(error);
      }
    }

    throw new NoMusicServiceError();
  }

  private async getService({ user }: { user: User }) {
    return this.services['spotify'];
  }

  private async mapOverServices(methodName: string, ...args: any[]) {
    const [data] = args;
    const services = Object.values(this.services);
    const responses = [];

    for (let index = 0; index < services.length; index++) {
      const service = services[index];
      try {
        await service.getTokens(data);
        const response = await service[methodName](...args);
        responses.push(response);
      } catch (error) {
        console.log(error);
      }
    }

    return responses;
  }

  async getCurrentTrack(
    ...args: Parameters<AbstractMusicServices['getCurrentTrack']>
  ): Promise<TrackResponse> {
    const service = await this.getServiceAuth(...args);

    return service.getCurrentTrack(...args);
  }

  async createLoginUrl(
    ...args: Parameters<AbstractMusicServices['createLoginUrl']>
  ) {
    const service = await this.getServiceAuth(...args);

    return service.createLoginUrl(...args);
  }

  async createAndSaveTokens(
    ...args: Parameters<AbstractMusicServices['createAndSaveTokens']>
  ) {
    const service = await this.getServiceAuth(...args);

    return service.createAndSaveTokens(...args);
  }

  async saveTokens(...args: Parameters<AbstractMusicServices['saveTokens']>) {
    const service = await this.getServiceAuth(...args);

    return service.saveTokens(...args);
  }

  async getTokens(...args: Parameters<AbstractMusicServices['getTokens']>) {
    const service = await this.getService(...args);

    return service.getTokens(...args);
  }

  async previousTrack(
    ...args: Parameters<AbstractMusicServices['previousTrack']>
  ) {
    const service = await this.getServiceAuth(...args);

    return service.previousTrack(...args);
  }

  async nextTrack(...args: Parameters<AbstractMusicServices['nextTrack']>) {
    const service = await this.getServiceAuth(...args);

    return service.nextTrack(...args);
  }

  async playSong(...args: Parameters<AbstractMusicServices['playSong']>) {
    const service = await this.getServiceAuth(...args);

    return service.playSong(...args);
  }

  async getTrack(...args: Parameters<AbstractMusicServices['getTrack']>) {
    const service = await this.getServiceAuth(...args);

    return service.getTrack(...args);
  }

  async getProfile(...args: Parameters<AbstractMusicServices['getProfile']>) {
    const service = await this.getServiceAuth(...args);

    return service.getProfile(...args);
  }

  async addToQueue(...args: Parameters<AbstractMusicServices['addToQueue']>) {
    const service = await this.getServiceAuth(...args);

    return service.addToQueue(...args);
  }

  async searchTracks(
    ...args: Parameters<AbstractMusicServices['searchTracks']>
  ) {
    const service = await this.getServiceAuth(...args);

    return service.searchTracks(...args);
  }

  async toggleFavorite(
    ...args: Parameters<AbstractMusicServices['toggleFavorite']>
  ) {
    const service = await this.getServiceAuth(...args);

    return service.toggleFavorite(...args);
  }

  async togglePlay(...args: Parameters<AbstractMusicServices['togglePlay']>) {
    const service = await this.getServiceAuth(...args);

    return service.togglePlay(...args);
  }

  async remove(...args: Parameters<AbstractMusicServices['remove']>) {
    const service = await this.getServiceAuth(...args);

    return service.remove(...args);
  }
}
