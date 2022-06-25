import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServices,
  MusicServiceCoreService,
  TrackResponse,
} from './music-service-core/music-service-core.service';
import { SpotifyServiceService } from './spotify-service/spotify-service.service';
import { DeezerServiceService } from './deezer-service/deezer-service.service';
import { Message } from 'src/bot-core/message/message';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class MusicServicesService extends AbstractMusicServices {
  services: Record<string, MusicServiceCoreService>;

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

  private getService(...args: any[]) {
    return this.services[this.spotifyService.type];
  }

  private async mapOverServices(methodName: string, ...args: any[]) {
    const [data] = args;
    const services = Object.values(this.services);
    const responses = [];

    for (let index = 0; index < services.length; index++) {
      const service = services[index];
      try {
        service.getTokens(data);
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
  ): Promise<TrackResponse[]> {
    return this.mapOverServices('getCurrentTrack', ...args);
  }

  async createLoginUrl(
    ...args: Parameters<AbstractMusicServices['createLoginUrl']>
  ) {
    const service = this.getService(...args);

    return service.createLoginUrl(...args);
  }

  async createAndSaveTokens(
    ...args: Parameters<AbstractMusicServices['createAndSaveTokens']>
  ) {
    const service = this.getService(...args);

    return service.createAndSaveTokens(...args);
  }

  async saveTokens(...args: Parameters<AbstractMusicServices['saveTokens']>) {
    const service = this.getService(...args);

    return service.saveTokens(...args);
  }

  async getTokens(...args: Parameters<AbstractMusicServices['getTokens']>) {
    const service = this.getService(...args);

    return service.getTokens(...args);
  }

  async previousTrack(
    ...args: Parameters<AbstractMusicServices['previousTrack']>
  ) {
    const service = this.getService(...args);

    return service.previousTrack(...args);
  }

  async nextTrack(...args: Parameters<AbstractMusicServices['nextTrack']>) {
    const service = this.getService(...args);

    return service.nextTrack(...args);
  }

  async playSong(...args: Parameters<AbstractMusicServices['playSong']>) {
    const service = this.getService(...args);

    return service.playSong(...args);
  }

  async getTrack(...args: Parameters<AbstractMusicServices['getTrack']>) {
    const service = this.getService(...args);

    return service.getTrack(...args);
  }

  async getProfile(...args: Parameters<AbstractMusicServices['getProfile']>) {
    const service = this.getService(...args);

    return service.getProfile(...args);
  }

  async addToQueue(...args: Parameters<AbstractMusicServices['addToQueue']>) {
    const service = this.getService(...args);

    return service.addToQueue(...args);
  }

  async searchTracks(
    ...args: Parameters<AbstractMusicServices['searchTracks']>
  ) {
    const service = this.getService(...args);

    return service.searchTracks(...args);
  }

  async toggleFavorite(
    ...args: Parameters<AbstractMusicServices['toggleFavorite']>
  ) {
    const service = this.getService(...args);

    return service.toggleFavorite(...args);
  }

  async togglePlay(...args: Parameters<AbstractMusicServices['togglePlay']>) {
    const service = this.getService(...args);

    return service.togglePlay(...args);
  }

  async remove(...args: Parameters<AbstractMusicServices['remove']>) {
    const service = this.getService(...args);

    return service.remove(...args);
  }
}
