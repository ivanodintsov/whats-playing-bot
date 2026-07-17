import { Injectable } from '@nestjs/common';
import { Provider } from '../parser/types';
import { SongsInfoService } from '../songs-info.service';

@Injectable()
export class ProcessService {
  constructor(private readonly songsInfoService: SongsInfoService) {}

  async processArtistAlbums({
    artistId,
    provider,
    data,
  }: {
    artistId: string;
    provider: Provider;
    data: any;
  }) {
    await this.songsInfoService.parseArtistAlbums(provider, artistId, data);
  }

  async processAlbumId({
    albumId,
    provider,
  }: {
    albumId: any;
    provider: Provider;
  }) {
    await this.songsInfoService.parseAlbum(provider, albumId);
  }

  async processAlbumTracks({
    albumId,
    provider,
    data,
  }: {
    albumId: any;
    provider: Provider;
    data: any;
  }) {
    await this.songsInfoService.processAlbumTracks(provider, albumId, data);
  }

  async processTrackId({
    trackId,
    provider,
  }: {
    trackId: any;
    provider: Provider;
  }) {
    await this.songsInfoService.processTrackByTrackId(provider, trackId);
  }
}
