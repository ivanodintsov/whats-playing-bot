import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExpiredMusicServiceTokenError, NoMusicServiceError } from 'src/errors';
import {
  ALBUM_TYPE,
  IAlbum,
  IArtist,
  ISongSimple,
  RELEASE_DATE_PRECISION,
  SONG_TYPE,
} from 'src/songs/types/types';
import { User } from '../music-service-core/music-service-core.service';
import { MusicServiceCoreService } from '../music-service-core/music-service-core.service';
import { SpotifyServiceService } from '../spotify-service/spotify-service.service';
import { DeezerCallbackDto } from './deezer-callback.dto';
import { NotSupportedByDeezer } from './errors/NotSupportedByDeezer';
import {
  DeezerTokens,
  DeezerTokensDocument,
} from './schemas/deezer-tokens.schema';
import { IDeezerAlbum, IDeezerArtist, IDeezerTrack } from './types';

const scopes = [
  'basic_access',
  'email',
  'offline_access',
  'manage_library',
  'manage_community',
  'delete_library',
  'listening_history',
];

const SPOTIFY_USER = { tg_id: 777 };
const DEEZER_USER = { tg_id: 777 };

@Injectable()
export class DeezerServiceService extends MusicServiceCoreService {
  type = 'deezer';
  serviceName = 'Deezer';

  private readonly DEEZER_AUTH_BASE_URL = 'https://connect.deezer.com/oauth';

  constructor(
    private readonly httpService: HttpService,
    private readonly spotifyService: SpotifyServiceService,
    private readonly appConfig: ConfigService,

    @InjectModel(DeezerTokens.name)
    private tokens: Model<DeezerTokensDocument>,
  ) {
    super();
  }

  async createLoginUrl(data: { redirectUri?: string } = {}) {
    const { redirectUri } = data;

    return `${this.DEEZER_AUTH_BASE_URL}/auth.php?app_id=${this.appConfig.get(
      'DEEZER_APP_ID',
    )}&redirect_uri=${redirectUri}&perms=${scopes.join(',')}`;
  }

  async createAndSaveTokens(data: { query: DeezerCallbackDto; user: User }) {
    const { query, user } = data;

    const response = await this.httpService
      .request({
        method: 'post',
        baseURL: this.DEEZER_AUTH_BASE_URL,
        url: '/access_token.php',
        params: {
          app_id: this.appConfig.get('DEEZER_APP_ID'),
          secret: this.appConfig.get('DEEZER_TOKEN'),
          code: query.code,
          output: 'json',
        },
      })
      .toPromise();

    await this.saveTokens({
      access_token: response.data.access_token,
      expires_in: response.data.expires,
      ...user,
    });

    return response.data;
  }

  async getCurrentTrack(data: { user: User }) {
    const tokens = await this.updateTokens(data);

    const response = await this.httpService
      .request<{
        data: {
          id: string;
          title: string;
          artist: {
            id: string;
            name: string;
          };
        }[];
      }>({
        method: 'get',
        url: '/user/me/history',
        params: {
          access_token: tokens.access_token,
        },
      })
      .toPromise();

    const lastTrack = response.data?.data?.[0];
    const searchString = `${lastTrack.title} ${lastTrack.artist.name}`;

    const spotifyTrack = await this.spotifyService.searchTracks({
      user: SPOTIFY_USER,
      search: searchString,
      options: { pagination: { limit: 1 } },
    });

    return {
      type: this.type,
      data: spotifyTrack.data?.[0],
      response,
    };
  }

  async getTrack(...args: Parameters<MusicServiceCoreService['getTrack']>) {
    const [data, ...rest] = args;
    const response = await this.spotifyService.getTrack(
      {
        ...data,
        user: SPOTIFY_USER,
      },
      ...rest,
    );

    return {
      ...response,
      type: this.type,
    };
  }

  async saveTokens(data) {
    const tokens = new this.tokens(data);
    await tokens.save();

    return tokens;
  }

  async getTokens({ user }: { user: User }) {
    const tokens = await this.tokens.findOne(user);

    return tokens;
  }

  protected async updateTokens(data: { user: User }) {
    const tokens = await this.getTokens(data);

    if (!tokens) {
      throw new NoMusicServiceError();
    }

    if (
      tokens.expires_date &&
      new Date().getTime() / 1000 >= tokens.expires_date
    ) {
      await tokens.remove();
      throw new ExpiredMusicServiceTokenError();
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    };
  }

  async addToQueue(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async previousTrack(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async nextTrack(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async toggleFavorite(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async togglePlay(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async playSong(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async getProfile(): Promise<never> {
    throw new NotSupportedByDeezer();
  }

  async searchTracks(
    ...args: Parameters<MusicServiceCoreService['searchTracks']>
  ) {
    const [data, ...rest] = args;
    const response = await this.spotifyService.searchTracks(
      {
        ...data,
        user: SPOTIFY_USER,
      },
      ...rest,
    );

    return {
      ...response,
      type: this.type,
    };
  }

  async remove({ user }: { user: User }) {
    await this.tokens.deleteMany(user);

    return {
      type: this.type,
    };
  }

  async searchTrack({
    search,
    type,
    isrc,
  }: {
    search: {
      artist?: string;
      track?: string;
      album?: string;
      year?: string | number;
    };
    isrc: string;
    type: 'album' | 'artist' | 'track';
  }) {
    const searchString = Object.values(search).join(' ');

    const tokens = await this.updateTokens({ user: DEEZER_USER });

    const response = await this.httpService
      .request<{
        data: IDeezerTrack[];
      }>({
        method: 'get',
        url: '/search',
        params: {
          q: searchString,
          access_token: tokens.access_token,
        },
      })
      .toPromise();

    let rawSong = response.data?.data?.[0];

    if (!rawSong) {
      const response = await this.httpService
        .request<IDeezerTrack>({
          method: 'get',
          url: `track/isrc:${isrc}`,
          params: {
            access_token: tokens.access_token,
          },
        })
        .toPromise();

      rawSong = response.data;
    }

    if (!rawSong) {
      throw new Error('Song not found');
    }

    const song = this.createDomainSong(rawSong);

    let artists: IArtist[] = [];

    if (rawSong.contributors?.length) {
      artists = rawSong.contributors.map(artist =>
        this.createDomainArtist(artist),
      );
    } else if (rawSong.artist) {
      artists = [this.createDomainArtist(rawSong.artist)];
    }

    const album = rawSong.album && this.createDomainAlbum(rawSong.album);

    return {
      type: this.type,
      response: { ...response },
      data: { song, artists, album },
    };
  }

  private createDomainSong(item: IDeezerTrack): ISongSimple {
    return {
      name: item.title,
      type: SONG_TYPE.track,
      trackNumber: item.track_position,
      links: {
        deezer: {
          url: item.link,
        },
      },
      ids: {
        deezer: {
          id: item.id,
        },
      },
      isrc: item.isrc,
    };
  }

  private createDomainArtist(artist: IDeezerArtist): IArtist {
    const image =
      artist.picture_xl ||
      artist.picture_big ||
      artist.picture_medium ||
      artist.picture_small ||
      artist.picture;

    return {
      name: artist.name,
      image: image
        ? {
            url: image,
          }
        : null,
      links: {
        deezer: {
          url: artist.link,
        },
      },
      ids: {
        deezer: {
          id: artist.id,
        },
      },
    };
  }

  private createDomainAlbum(album: IDeezerAlbum): IAlbum {
    const image =
      album.cover_xl ||
      album.cover_big ||
      album.cover_medium ||
      album.cover_small ||
      album.cover;

    return {
      albumType: ALBUM_TYPE.album,
      availableMarkets: [],
      totalTracks: 0,
      links: {
        deezer: {
          url: album.link,
        },
      },
      ids: {
        deezer: {
          id: album.id,
        },
      },
      image: image
        ? {
            url: image,
          }
        : null,
      name: album.title,
      releaseDate: album.release_date,
      releaseDatePrecision: RELEASE_DATE_PRECISION.day,
    };
  }
}
