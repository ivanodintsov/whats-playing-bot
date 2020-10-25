import { HttpService, Injectable } from '@nestjs/common';

type SongInput = {
  url: string;
  country?: string;
};

type Song = {
  link: string;
};

type SongDict = {
  tidal: Song;
  itunes: Song;
  spotify: Song;
  youtubeMusic: Song;
};

type SongResponse = {
  data: {
    links: SongDict;
    image: string;
  }
};

@Injectable()
export class SongWhipService {
  private readonly API_URL: string = 'https://songwhip.com/api/';

  constructor(private readonly httpService: HttpService) {}

  async getSong(input: SongInput) {
    const response = await this.httpService.post<SongResponse>(this.API_URL, input).toPromise();
    return response.data;
  }
}
