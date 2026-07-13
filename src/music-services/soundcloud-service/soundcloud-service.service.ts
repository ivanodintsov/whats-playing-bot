import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { parse } from 'date-fns';
import { MusicServiceCoreService } from '../music-service-core/music-service-core.service';
import {
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDER_NAMES,
} from 'src/constants';
import {
  MusicServiceToken,
  MusicServiceTokenDomain,
} from '../models/music-service-token.model';
import {
  MusicServiceContextOptions,
  CreateMusicServiceTokensData,
  FindMusicServiceTokensProps,
  CurrentTrackResponse,
  TrackResponse,
  FullTrackResponse,
  AlbumResponse,
  ArtistResponse,
  MusicServiceSearchOptions,
  ArtistAlbumsResponse,
  AlbumTracksResponse,
  ToggleFavoriteResponse,
  TogglePlayResponse,
  ProfileResponse,
  SearchResponse,
  ITrack,
  SONG_TYPE,
  IArtist,
  IGenre,
  IImage,
  IAlbum,
  LINK_TYPE,
} from '../music-service-core/types';
import {
  MusicServiceURI,
  SoundcloudURI,
} from '../music-services-uri-parser/types';
import { Logger } from 'src/logger.service';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosInstance, isAxiosError } from 'axios';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoTrackError,
} from 'src/errors';
import {
  SoundcloudApiMeRecentlyPlayedTracks,
  SoundcloudApiMeResponse,
  SoundcloudApiResolveUrlResponse,
  SoundcloudApiSearchTracks,
  SoundCloudTrack,
} from './types';
import { Maybe } from 'src/typings';
import {
  NO_ALBUM,
  NO_ARTIST,
  PAGINATION_DEFAULTS,
  TOGGLE_ACTIONS,
} from '../music-service-core/constants';
import { ParserTextNormalizer } from 'src/songs-info/parser/parset-text-normalizer';
import { NotSupportedBySoundCloud } from './errors/NotSupportedBySoundCloud';
import { URL } from 'url';
import { ParserMergeUtils } from 'src/songs-info/parser/parser-merge-utils';
import { SoundCloudURNParser } from 'src/songs-info/soundcloud-parser/soundcloud-urn-parser';

@Injectable()
export class SoundcloudService extends MusicServiceCoreService {
  type: MUSIC_SERVICE_PROVIDERS = MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
  serviceName = 'SoundCloud';

  private readonly SOUNDCLOUD_AUTH_BASE_URL = 'https://secure.soundcloud.com';
  private readonly SOUNDCLOUD_API_BASE_URL = 'https://api.soundcloud.com';

  private readonly logger = new Logger(SoundcloudService.name);
  private api: AxiosInstance;
  private user: FindMusicServiceTokensProps;
  private tokens: MusicServiceTokenDomain;
  private redirectUri?: string;

  constructor(
    private readonly httpService: HttpService,
    private appConfig: ConfigService,
    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
  ) {
    super();
  }

  private _setTokens(tokens: MusicServiceTokenDomain) {
    this.tokens = tokens;
    this.user = {
      userId: tokens.userId,
      provider: tokens.provider,
    };
  }

  private _createApi() {
    const api = this.httpService.axiosRef.create({
      baseURL: this.SOUNDCLOUD_API_BASE_URL,
      headers: {
        Accept: 'application/json',
      },
    });

    api.interceptors.request.use((config) => {
      config.headers['Authorization'] = `OAuth ${this.tokens.access_token}`;

      return config;
    });

    return api;
  }

  async connect(ctx: MusicServiceContextOptions): Promise<SoundcloudService> {
    const service = new SoundcloudService(
      this.httpService,
      this.appConfig,
      this.musicServiceTokenModel,
    );

    service.api = service._createApi();
    service.user = ctx.user;
    service.redirectUri = ctx.redirectUrl;

    if (ctx.tokens) {
      service._setTokens(ctx.tokens);
    }

    await service.updateTokens();
    return service;
  }
  async createLoginUrl() {
    const codeVerifier = crypto.randomBytes(64).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const state = crypto.randomBytes(64).toString('base64url');

    const query = {
      client_id: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_ID'),
      redirect_uri: this.appConfig.get<string>(
        'CONNECT_MUSIC_SERVICE_CALLBACK_URL',
      ),
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    };

    return {
      url: `${this.SOUNDCLOUD_AUTH_BASE_URL}/authorize?${new URLSearchParams(query).toString()}`,
      rest: {
        codeVerifier,
        state,
      },
    };
  }

  private _getExpiresDate(obtainDate: Date, expiresIn: number) {
    return Math.floor(obtainDate.getTime() / 1000) + expiresIn;
  }

  async saveTokens({
    obtainDate,
    ...data
  }: CreateMusicServiceTokensData): Promise<MusicServiceToken> {
    const tokens = new this.musicServiceTokenModel({
      ...data,
      expires_date: this._getExpiresDate(obtainDate, data.expires_in),
      service: this.type,
    });
    await tokens.save();
    return tokens;
  }

  // TODO: Remove method
  createTokens(
    data: CreateMusicServiceTokensData & {
      expires_date: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<MusicServiceToken> {
    throw new Error('Method not implemented.');
  }

  async getTokens({
    userId,
    provider,
  }: FindMusicServiceTokensProps): Promise<MusicServiceToken> {
    const tokens = await this.musicServiceTokenModel.findOne({
      where: { userId, provider, service: this.type },
    });
    return tokens;
  }

  async createAndSaveTokens(
    query: any,
    rest: any,
    data: Pick<
      CreateMusicServiceTokensData,
      'obtainDate' | 'userId' | 'provider'
    >,
  ): Promise<MusicServiceToken> {
    const queryParams = {
      grant_type: 'authorization_code',
      client_id: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_ID'),
      client_secret: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_SECRET'),
      redirect_uri: this.appConfig.get<string>(
        'CONNECT_MUSIC_SERVICE_CALLBACK_URL',
      ),
      code_verifier: rest.codeVerifier,
      code: query.code,
    };

    const response = await lastValueFrom(
      this.httpService.request<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
      }>({
        method: 'post',
        baseURL: this.SOUNDCLOUD_AUTH_BASE_URL,
        url: '/oauth/token',
        data: new URLSearchParams(queryParams),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    const tokensResponse = response.data;

    const tokens = await this.saveTokens({
      access_token: tokensResponse.access_token,
      expires_in: tokensResponse.expires_in,
      refresh_token: tokensResponse.refresh_token,
      scope: tokensResponse.scope,
      token_type: tokensResponse.token_type,
      ...data,
    });

    // const tokens = await this.saveTokens({
    //   ...response.data,
    //   ...data,
    // });

    return tokens;
  }

  private async _refreshTokens() {
    const queryParams = {
      grant_type: 'refresh_token',
      client_id: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_ID'),
      client_secret: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_SECRET'),
      refresh_token: this.tokens.refresh_token,
    };

    const response = await lastValueFrom(
      this.httpService.request<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
      }>({
        method: 'post',
        baseURL: this.SOUNDCLOUD_AUTH_BASE_URL,
        url: '/oauth/token',
        data: new URLSearchParams(queryParams),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return response.data;
  }

  async updateTokens(): Promise<MusicServiceTokenDomain> {
    if (!this.tokens) {
      const tokens = await this.getTokens(this.user);

      if (!tokens) {
        throw new NoMusicServiceError();
      }

      this._setTokens(tokens.toJSON());
    }

    const REFRESH_MARGIN = 30;

    try {
      if (Date.now() / 1000 >= this.tokens.expires_date - REFRESH_MARGIN) {
        const obtainTokensDate = new Date();
        const refreshResponse = await this._refreshTokens();
        const expiresDate = this._getExpiresDate(
          obtainTokensDate,
          refreshResponse.expires_in,
        );

        await this.musicServiceTokenModel.update(
          {
            ...refreshResponse,
            expires_date: expiresDate,
          },
          {
            where: {
              id: this.tokens.id,
            },
          },
        );

        const data = {
          ...this.tokens,
          ...refreshResponse,
          expires_date: expiresDate,
        };

        this._setTokens(data);

        return data;
      }

      return this.tokens;
    } catch (error) {
      if (isAxiosError(error)) {
        const errorName = error.response.data?.error;

        if (errorName === 'invalid_grant') {
          await this.removeTokens();
          throw new ExpiredMusicServiceTokenError();
        }

        this.logger.error(errorName, error.stack, error.stack);
        throw error;
      }

      this.logger.error(error.message, error.stack, error);
      throw error;
    }
  }

  async removeTokens(): Promise<void> {
    await this.musicServiceTokenModel.destroy({
      where: {
        userId: this.user.userId,
        provider: this.user.provider,
        service: this.type,
      },
    });
  }

  async getCurrentTrack(): Promise<CurrentTrackResponse> {
    await this.updateTokens();
    // const response = await this.api.getMyCurrentPlayingTrack();

    const response = await this.api.get<SoundcloudApiMeRecentlyPlayedTracks>(
      '/me/recently-played/tracks',
      {
        params: {
          access: 'playable,preview,blocked',
        },
      },
    );

    return this._createTrack(response.data.collection[0]);
  }

  async getTrack(data: { id: string }): Promise<TrackResponse> {
    await this.updateTokens();

    const response = await this.api.get<SoundCloudTrack>(`/tracks/${data.id}`);

    return this._createTrack(response.data);
  }

  async resolveUrl({
    url,
  }: {
    url: string;
  }): Promise<SoundcloudApiResolveUrlResponse> {
    const response = await this.api.get<SoundcloudApiResolveUrlResponse>(
      '/resolve',
      {
        params: {
          url,
        },
      },
    );

    return response.data;
  }

  async getFullTrack(data: { id: any }): Promise<FullTrackResponse> {
    const response = await this.api.get<SoundCloudTrack>(`/tracks/${data.id}`);

    return this._createTrack(response.data);
  }

  private _parseSoundcloudArtists(track: SoundCloudTrack): IArtist[] {
    if (!track.metadata_artist) {
      return [this._createArtist(null, track)];
    }

    const artistsStringList = ParserMergeUtils.uniqueStringArray(
      track.metadata_artist.split(',').map((artist) => artist.trim()),
    );

    const artists = artistsStringList.map((artist) =>
      this._createArtist(artist, track),
    );

    return artists;
  }

  private _createAlbumSimple(track: SoundCloudTrack): IAlbum {
    const artists: IArtist[] = this._parseSoundcloudArtists(track);
    let releaseDate: Date;

    try {
      if (track.release_year && track.release_month && track.release_month) {
        const year = track.release_year;
        const month = `${track.release_month < 10 ? `0${track.release_month}` : track.release_month}`;
        const day = `${track.release_day < 10 ? `0${track.release_day}` : track.release_day}`;
        releaseDate = parse(
          `${year}-${month}-${day}`,
          'yyyy-MM-dd',
          new Date(),
        );
      }
    } catch (error) {}

    const artistImage = track.artwork_url || track.user.avatar_url;

    const largeImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    const mediumImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    const smallImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    return {
      id: NO_ALBUM,
      albumType: null,
      availableMarkets: null,
      totalTracks: null,
      artists,
      links: [],
      image: largeImage
        ? {
            ...largeImage,
            medium: mediumImage,
            small: smallImage,
          }
        : null,
      name: NO_ALBUM,
      releaseDate,

      isrc: null,
      upc: null,
      ean: null,
    };
  }

  private _createTrack(track: SoundCloudTrack): ITrack {
    return {
      id: track.id.toString(),
      name: track.title,
      type: SONG_TYPE.track,
      trackNumber: null,
      links: [
        {
          providerUrl: SoundCloudURNParser.normalizeUrl(track.permalink_url),
          provider: MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
          providerId: track.id.toString(),
          type: LINK_TYPE.TRACK,
        },
      ],
      duration: track.duration,
      explicit: null,
      artists: this._parseSoundcloudArtists(track),
      album: this._createAlbumSimple(track),
      isrc: track.isrc && [track.isrc],
      upc: null,
      ean: null,
    };
  }

  private _createArtist(artist: string, track?: SoundCloudTrack): IArtist {
    let genres: IGenre[] = track?.genre
      ? [
          {
            name: track.genre,
            slug: track.genre.toLowerCase(),
          },
        ]
      : [];

    const userName = track?.user.username;
    const artistName = artist || '';
    const isArtistMatchWithUser = ParserTextNormalizer.matchStrings(
      userName,
      artistName,
    );
    const isTrackUserArtist = !artist || isArtistMatchWithUser.matched;
    const artistImage = artist
      ? isArtistMatchWithUser.matched
        ? track.user.avatar_url
        : null
      : track.artwork_url;

    const largeImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    const mediumImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    const smallImage: Maybe<IImage> = artistImage
      ? {
          url: artistImage?.replace('-large.', '-t500x500.'),
          width: 500,
          height: 500,
        }
      : null;

    return {
      id: NO_ARTIST,
      name: isTrackUserArtist ? userName : artist,
      links: isTrackUserArtist
        ? [
            {
              providerUrl: SoundCloudURNParser.normalizeUrl(
                track.user.permalink_url,
              ),
              providerId: track.user.id.toString(),
              provider: MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
              type: LINK_TYPE.ARTIST,
            },
          ]
        : [],
      genres,
      image: largeImage
        ? {
            ...largeImage,
            medium: mediumImage,
            small: smallImage,
          }
        : null,
    };
  }

  getAlbum(data: { id: any }): Promise<AlbumResponse> {
    throw new Error('Method not implemented.');
  }
  getArtist(data: { id: any }): Promise<ArtistResponse> {
    throw new Error('Method not implemented.');
  }
  getArtistAlbums(data: {
    id: any;
    options?: MusicServiceSearchOptions;
  }): Promise<ArtistAlbumsResponse> {
    throw new Error('Method not implemented.');
  }
  getAlbumTracks(data: {
    id: any;
    options?: MusicServiceSearchOptions;
  }): Promise<AlbumTracksResponse> {
    throw new Error('Method not implemented.');
  }
  previousTrack(): Promise<void> {
    throw new NotSupportedBySoundCloud();
  }
  nextTrack(): Promise<void> {
    throw new NotSupportedBySoundCloud();
  }

  createUrnFromURI(uri: SoundcloudURI) {
    if (uri.uri.type === 'track') {
      return `soundcloud:tracks:${uri.uri.id}`;
    }
  }

  async toggleFavorite({
    uris,
  }: {
    uris: [SoundcloudURI];
  }): Promise<ToggleFavoriteResponse> {
    await this.updateTokens();
    const urn = this.createUrnFromURI(uris[0]);
    const trackResponse = await this.api.get<SoundCloudTrack>(`/tracks/${urn}`);

    if (trackResponse.data.user_favorite) {
      await this.api.delete(`/likes/tracks/${trackResponse.data.urn}`);
      return { action: TOGGLE_ACTIONS.REMOVED };
    }

    await this.api.post(`/likes/tracks/${trackResponse.data.urn}`);
    return { action: TOGGLE_ACTIONS.SAVED };
  }

  togglePlay(): Promise<TogglePlayResponse> {
    throw new NotSupportedBySoundCloud();
  }
  playSong(data: { uri: MusicServiceURI }): Promise<void> {
    throw new NotSupportedBySoundCloud();
  }
  addToQueue(data: { uri: MusicServiceURI }): Promise<void> {
    throw new NotSupportedBySoundCloud();
  }

  async getProfile(): Promise<ProfileResponse> {
    await this.updateTokens();
    const { data } = await this.api.get<SoundcloudApiMeResponse>('/me');

    return {
      id: data.id?.toString(),
      username: data.username,
      uri: data.urn,
      url: data.permalink_url,
    };
  }

  async searchTracks({
    search,
    options,
  }: {
    search: string;
    options?: MusicServiceSearchOptions;
  }): Promise<SearchResponse> {
    await this.updateTokens();

    const prevNextUrlParams = options?.pagination.next
      ? Object.fromEntries(new URL(options.pagination.next).searchParams)
      : {};

    const response = await this.api.get<SoundcloudApiSearchTracks>('/tracks', {
      params: {
        q: search,
        access: 'playable,preview,blocked',
        linked_partitioning: true,
        limit: options?.pagination.limit || PAGINATION_DEFAULTS.limit,
        offset: options?.pagination.offset || PAGINATION_DEFAULTS.offset,
        ...prevNextUrlParams,
      },
    });

    const tracks = response.data.collection.map((track) =>
      this._createTrack(track),
    );

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      tracks,
      pagination: nextUrl
        ? {
            offset: nextUrl.searchParams.get('offset') || '0',
            next: nextUrl.toString(),
          }
        : {
            offset: '0',
            next: null,
          },
    };
  }
}
