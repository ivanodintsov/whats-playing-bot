import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Link } from '../models/link.model';
import {
  IArtist,
  IExternalUrl,
  ITrack,
} from 'src/music-services/music-service-core/types';
import { fromUUID } from 'src/utils/shortUUID';

export type TrackIdData = {
  id: string;
  service: Link['provider'];
  platform: string;
};

export type TrackIdInputData = {
  platform: string;
};

@Injectable()
export class LinksService {
  constructor(private appConfig: ConfigService) {}

  private createTrackId(
    track: ITrack,
    link: IExternalUrl,
    { platform }: TrackIdInputData,
  ) {
    return Buffer.from(
      JSON.stringify({
        id: track.oldId || track.id,
        service: link.provider,
        platform,
      }),
    ).toString('base64');
  }

  parseTrackId(id: string): TrackIdData {
    return JSON.parse(Buffer.from(id, 'base64').toString());
  }

  createTrackUrlFromData(
    track: ITrack,
    link: IExternalUrl,
    data: TrackIdInputData,
  ) {
    return this.createTrackServiceUrl({
      id: track.oldId || track.id,
      provider: link.provider,
    });
  }

  createArtistUrlFromData(artist: IArtist) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/artist/${fromUUID({ value: artist.id })}/`;
  }

  createTrackUrlFromDataList(
    track: ITrack,
    links: IExternalUrl[],
    data: TrackIdInputData,
  ) {
    const createdLinks: string[] = (links || []).map((link) => {
      return this.createTrackServiceUrl({
        id: track.oldId || track.id,
        provider: link.provider,
      });
    });

    return createdLinks;
  }

  createTrackServiceUrl({ id, provider }: { id: string; provider: string }) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/song/${fromUUID({ value: id })}/${provider}/`;
  }

  createTrackUrl({ id }: { id: string }) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/song/${fromUUID({ value: id })}/`;
  }
}
