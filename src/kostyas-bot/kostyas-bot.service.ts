import { HttpService, Injectable } from '@nestjs/common';

type SongDataInput = {
  link: string;
  user_chat_id: number;
  chat_id: number;
  mute_bots?: 'all' | 'links' | 'mp3';
  download?: boolean;
};

@Injectable()
export class KostyasBotService {
  private readonly API_URL: string = 'https://api.uradio.link/song';

  constructor(
    private readonly httpService: HttpService,
  ) {}

  sendLinks(data: SongDataInput) {
    return this.httpService.post(this.API_URL, {
      ...data,
      mute_bots: 'links',
      download: false,
    }).toPromise();
  }
}
