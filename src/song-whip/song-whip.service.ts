import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { Logger } from 'src/logger';
import { Link, SongWhip, SongWhipLinks } from './song-whip.entity';

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

type Platform =
  | 'spotify'
  | 'itunes'
  | 'appleMusic'
  | 'youtube'
  | 'youtubeMusic'
  | 'google'
  | 'googleStore'
  | 'pandora'
  | 'deezer'
  | 'tidal'
  | 'amazonStore'
  | 'amazonMusic'
  | 'soundcloud'
  | 'napster'
  | 'yandex'
  | 'spinrilla'
  | 'audius'
  | 'audiomack'
  | 'anghami'
  | 'boomplay';

type APIProvider =
  | 'spotify'
  | 'itunes'
  | 'youtube'
  | 'google'
  | 'pandora'
  | 'deezer'
  | 'tidal'
  | 'amazon'
  | 'soundcloud'
  | 'napster'
  | 'yandex'
  | 'spinrilla'
  | 'audius'
  | 'audiomack'
  | 'anghami'
  | 'boomplay';

type SongResponse = {
  entityUniqueId: string;
  pageUrl: string;
  userCountry: string;
  linksByPlatform: Record<
    string,
    {
      entityUniqueId: string;
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    }
  >;
  entitiesByUniqueId: Record<
    string,
    {
      id: string;
      type: 'song' | 'album';
      title?: string;
      artistName?: string;
      thumbnailUrl?: string;
      thumbnailWidth?: number;
      thumbnailHeight?: number;
      apiProvider: APIProvider;
      platforms: Platform[];
    }
  >;
};

@Injectable()
export class SongWhipService {
  private readonly API_URL: string = 'https://api.song.link/v1-alpha.1/';
  private readonly logger = new Logger(SongWhipService.name);
  constructor(private readonly httpService: HttpService) {}

  async getSong(input: SongInput): Promise<SongWhip | null> {
    const response = await this.httpService
      .get<SongResponse>(`${this.API_URL}links`, {
        params: {
          songIfSingle: true,
          url: input.url,
          userCountry: input.country ?? null,
        },
      })
      .toPromise();
    const rawData: SongResponse = R.path(['data'], response);

    if (!rawData) {
      return null;
    }

    let name: string;
    let image: string;

    const links: SongWhipLinks = Object.fromEntries(
      Object.entries(rawData.linksByPlatform).map(([apiProvider, value]) => {
        const entitiyByUniqueId =
          rawData.entitiesByUniqueId[value.entityUniqueId];
        const link: Link = {
          link: value.url,
          countries: input.country ? [input.country] : [],
          providerId: entitiyByUniqueId.id,
        };
        const linkTitle = entitiyByUniqueId.title;
        const linkImage = entitiyByUniqueId.thumbnailUrl;

        if (linkTitle) {
          name = linkTitle;
        }

        if (image) {
          image = linkImage;
        }

        return [apiProvider, [link]];
      }),
    );

    const transformedResponse: SongWhip = {
      type: 'song',
      id: rawData.entityUniqueId,
      path: rawData.pageUrl,
      name,
      url: rawData.pageUrl,
      sourceUrl: input.url,
      sourceCountry: rawData.userCountry,
      releaseDate: null,
      createdAt: null,
      updatedAt: null,
      refreshedAt: null,
      image,
      config: null,
      linksCountries: [],
      artists: [],
      links,
      isrc: null,
    };

    return transformedResponse;
  }
}
