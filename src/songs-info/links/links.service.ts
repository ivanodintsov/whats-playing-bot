import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Link } from '../models/link.model';
import { Track } from '../models/track.model';
import { IExternalUrl, ITrack } from '../types/parser';

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
    const id = this.createTrackId(track, link, data);
    return this.createTrackUrl(id);
  }

  createTrackUrlFromDataList(
    track: ITrack,
    links: IExternalUrl[],
    data: TrackIdInputData,
  ) {
    const createdLinks: string[] = (links || []).map(link => {
      const id = this.createTrackId(track, link, data);
      return this.createTrackUrl(id);
    });

    return createdLinks;
  }

  createTrackUrl(id: string) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/songs/share/${id}/`;
  }
}
