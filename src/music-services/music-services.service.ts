import { Injectable } from '@nestjs/common';
import {
  AbstractMusicServiceBasic,
  MusicServiceCoreService,
} from './music-service-core/music-service-core.service';
import { SpotifyServiceService } from './spotify-service/spotify-service.service';

@Injectable()
export class MusicServicesService extends AbstractMusicServiceBasic {
  private musicServices: Record<string, MusicServiceCoreService>;

  constructor(private readonly spotifyService: SpotifyServiceService) {
    super();
    this.musicServices = {
      [spotifyService.type]: spotifyService,
    };
  }

  private getService(...args: any[]) {
    return this.musicServices[this.spotifyService.type];
  }

  async getCurrentTrack(
    ...args: Parameters<AbstractMusicServiceBasic['getCurrentTrack']>
  ) {
    const service = this.getService(...args);

    return service.getCurrentTrack(...args);
  }

  async createLoginUrl(
    ...args: Parameters<AbstractMusicServiceBasic['createLoginUrl']>
  ) {
    const service = this.getService(...args);

    return service.createLoginUrl(...args);
  }

  async createAndSaveTokens(
    ...args: Parameters<AbstractMusicServiceBasic['createAndSaveTokens']>
  ) {
    const service = this.getService(...args);

    return service.createAndSaveTokens(...args);
  }

  async saveTokens(
    ...args: Parameters<AbstractMusicServiceBasic['saveTokens']>
  ) {
    const service = this.getService(...args);

    return service.saveTokens(...args);
  }

  async getTokens(...args: Parameters<AbstractMusicServiceBasic['getTokens']>) {
    const service = this.getService(...args);

    return service.getTokens(...args);
  }

  async previousTrack(
    ...args: Parameters<AbstractMusicServiceBasic['previousTrack']>
  ) {
    const service = this.getService(...args);

    return service.previousTrack(...args);
  }

  async nextTrack(...args: Parameters<AbstractMusicServiceBasic['nextTrack']>) {
    const service = this.getService(...args);

    return service.nextTrack(...args);
  }

  async playSong(...args: Parameters<AbstractMusicServiceBasic['playSong']>) {
    const service = this.getService(...args);

    return service.playSong(...args);
  }

  async getTrack(...args: Parameters<AbstractMusicServiceBasic['getTrack']>) {
    const service = this.getService(...args);

    return service.getTrack(...args);
  }

  async getProfile(
    ...args: Parameters<AbstractMusicServiceBasic['getProfile']>
  ) {
    const service = this.getService(...args);

    return service.getProfile(...args);
  }

  async addToQueue(
    ...args: Parameters<AbstractMusicServiceBasic['addToQueue']>
  ) {
    const service = this.getService(...args);

    return service.addToQueue(...args);
  }

  async searchTracks(
    ...args: Parameters<AbstractMusicServiceBasic['searchTracks']>
  ) {
    const service = this.getService(...args);

    return service.searchTracks(...args);
  }

  async toggleFavorite(
    ...args: Parameters<AbstractMusicServiceBasic['toggleFavorite']>
  ) {
    const service = this.getService(...args);

    return service.toggleFavorite(...args);
  }

  async togglePlay(
    ...args: Parameters<AbstractMusicServiceBasic['togglePlay']>
  ) {
    const service = this.getService(...args);

    return service.togglePlay(...args);
  }

  async remove(...args: Parameters<AbstractMusicServiceBasic['remove']>) {
    const service = this.getService(...args);

    return service.remove(...args);
  }
}
