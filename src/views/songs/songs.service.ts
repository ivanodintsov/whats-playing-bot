import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SongIdData = {
  id: string;
  service: string;
  platform: string;
};

@Injectable()
export class SongsService {
  constructor(private appConfig: ConfigService) {}

  private createSongId({ id, service, platform }: SongIdData) {
    return Buffer.from(
      JSON.stringify({
        id,
        service,
        platform,
      }),
    ).toString('base64');
  }

  parseSongId(id: string): SongIdData {
    return JSON.parse(Buffer.from(id, 'base64').toString());
  }

  createSongUrlFromData(data: SongIdData) {
    const id = this.createSongId(data);
    return this.createSongUrl(id);
  }

  createSongUrl(id: string) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/songs/share/${id}`;
  }
}
