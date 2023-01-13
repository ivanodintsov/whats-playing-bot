import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Artist } from '../models/artist.model';
import { ParserService, Provider } from '../parser/parser.service';
import { SongsInfoService } from '../songs-info.service';
import { IArtist } from '../types/parser';

@Injectable()
export class ProcessService {
  constructor(
    @InjectModel(Artist)
    private readonly artistModel: typeof Artist,

    private readonly songsInfoService: SongsInfoService,
  ) {}

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
    await this.songsInfoService.processTrack(provider, trackId);
  }
}
