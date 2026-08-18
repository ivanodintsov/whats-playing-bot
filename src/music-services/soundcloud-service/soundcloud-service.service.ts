import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { parse } from 'date-fns';
import {
  MusicServiceConnection,
  MusicServiceCoreService,
} from '../music-service-core/music-service-core.service';
import {
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDER_NAMES,
} from 'src/constants';
import { MusicServiceToken } from '../models/music-service-token.model';
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
  SearchResponseRaw,
  PaginatedResponse,
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
import { ExpiredSoundCloudTokenError } from './errors/ExpiredSoundCloudTokenError';
import {
  ArtistPlaylistsResponse,
  ArtistTracksResponse,
  SearchPlaylistsResponse,
  SearchUsersResponse,
  SoundCloudAccessType,
  SoundcloudApiArtistPlaylists,
  SoundcloudApiArtistTracks,
  SoundcloudApiMeRecentlyPlayedTracks,
  SoundcloudApiMeResponse,
  SoundcloudApiResolveUrlResponse,
  SoundcloudApiSearchPlaylists,
  SoundcloudApiSearchTracks,
  SoundcloudApiSearchUsers,
  SoundCloudMusicServiceAccessOptions,
  SoundCloudMusicServiceSearchOptions,
  SoundCloudPlaylist,
  SoundCloudTrack,
  SoundCloudTrackStream,
  SoundCloudUser,
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
import { MusicServicePooledToken } from 'src/songs-info/tokens-pool/polled-token';
import { SystemMusicServiceToken } from '../models/system-music-service-token.model';
import { httpAgent, httpsAgent } from 'src/custom-http/shared-agents';

@Injectable()
export class SoundcloudService extends MusicServiceCoreService {
  type: MUSIC_SERVICE_PROVIDERS = MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
  serviceName = 'SoundCloud';

  private readonly SOUNDCLOUD_AUTH_BASE_URL = 'https://secure.soundcloud.com';
  private readonly SOUNDCLOUD_API_BASE_URL = 'https://api.soundcloud.com';

  private readonly logger = new Logger(SoundcloudService.name);
  private api: AxiosInstance;
  private tokens: MusicServicePooledToken;
  private redirectUri?: string;

  private _accessToken: string;
  private _refreshToken: string;

  constructor(
    private readonly httpService: HttpService,
    private appConfig: ConfigService,
    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
    @InjectModel(SystemMusicServiceToken)
    private systeMusicServiceTokenModel: typeof SystemMusicServiceToken,
  ) {
    super();
  }

  private async _setTokens(pooledToken: MusicServicePooledToken) {
    this.tokens = pooledToken;
    const tokens = await pooledToken.getFreshToken();
    this._accessToken = tokens.access_token;
    this._refreshToken = tokens.refresh_token;
  }

  private _createApi() {
    const api = this.httpService.axiosRef.create({
      baseURL: this.SOUNDCLOUD_API_BASE_URL,
      timeout: 10000,
      maxRedirects: 5,
      httpAgent,
      httpsAgent,
      headers: {
        Accept: 'application/json',
      },
    });

    api.interceptors.request.use(async (config) => {
      config.headers['Authorization'] = `OAuth ${this._accessToken}`;

      return config;
    });

    return api;
  }

  async connect(
    ctx: MusicServiceContextOptions,
  ): Promise<MusicServiceConnection<SoundcloudService>> {
    try {
      const service = new SoundcloudService(
        this.httpService,
        this.appConfig,
        this.musicServiceTokenModel,
        this.systeMusicServiceTokenModel,
      );

      service.api = service._createApi();
      service.redirectUri = ctx.redirectUrl;

      await service._setTokens(ctx.token);
      await service.updateTokens();

      const release = async () => {
        await ctx.token.release();
      };

      return {
        service,
        release,
        using: async (callback) => {
          try {
            return await callback(service);
          } finally {
            await release();
          }
        },
      };
    } catch (error) {
      await ctx.token.release();
      throw error;
    }
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

    return tokens;
  }

  private async createAndSaveServiceTokens(
    data: Pick<CreateMusicServiceTokensData, 'obtainDate'>,
  ): Promise<SystemMusicServiceToken> {
    const queryParams = {
      grant_type: 'client_credentials',
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
          Authorization: `Basic ${Buffer.from(
            `${this.appConfig.get<string>('SOUNDCLOUD_CLIENT_ID')}:${this.appConfig.get<string>('SOUNDCLOUD_CLIENT_SECRET')}`,
          ).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    const tokensResponse = response.data;

    const tokens = new this.systeMusicServiceTokenModel({
      access_token: tokensResponse.access_token,
      expires_in: tokensResponse.expires_in,
      refresh_token: tokensResponse.refresh_token,
      scope: tokensResponse.scope,
      token_type: tokensResponse.token_type,
      ...data,
      expires_date: this._getExpiresDate(
        data.obtainDate,
        tokensResponse.expires_in,
      ),
      service: MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD,
    });
    await tokens.save();

    return tokens;
  }

  public async findOrcreateServiceTokens() {
    const tokens = await this.systeMusicServiceTokenModel.findOne({
      where: { service: MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD },
    });

    if (!tokens) {
      return this.createAndSaveServiceTokens({
        obtainDate: new Date(),
      });
    }

    return tokens;
  }

  private async _refreshTokens() {
    const queryParams = {
      grant_type: 'refresh_token',
      client_id: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_ID'),
      client_secret: this.appConfig.get<string>('SOUNDCLOUD_CLIENT_SECRET'),
      refresh_token: this._refreshToken,
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

  async updateTokens(): Promise<MusicServicePooledToken> {
    const REFRESH_MARGIN = 30;
    const tokens = await this.tokens.getFreshToken();

    try {
      if (Date.now() / 1000 >= tokens.expires_date - REFRESH_MARGIN) {
        await this.tokens.withRefresh(async () => {
          const obtainTokensDate = new Date();
          const refreshResponse = await this._refreshTokens();
          const expiresDate = this._getExpiresDate(
            obtainTokensDate,
            refreshResponse.expires_in,
          );

          await tokens.update({
            ...refreshResponse,
            expires_date: expiresDate,
          });
        });
      }

      await this._setTokens(this.tokens);

      return this.tokens;
    } catch (error) {
      if (isAxiosError(error)) {
        const errorName = error.response.data?.error;

        if (errorName === 'invalid_grant') {
          this.logger.debug(error, error.stack, error.stack);
          await this.logout();
          throw new ExpiredSoundCloudTokenError();
        }

        this.logger.error(errorName, error.stack, error.stack);

        throw error;
      }

      this.logger.debug(error.message, error.stack, error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.tokens.invalidate();
  }

  async getTrackStream(data: { id: string }) {
    const response = await this.api.get<SoundCloudTrackStream>(
      `/tracks/${data.id}/streams`,
    );
    return response.data;
  }

  async resolveStreamUrl(data: { url: string }) {
    const response = await this.api.get(data.url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 300 && status < 400,
    });

    const url =
      response.headers.location ??
      response.data?.location ??
      response.data?.url;

    if (!url) {
      throw new Error('No playback URL');
    }

    const expires = this.getExpiresAtFromStreamUrl(url);

    return { url, expires };
  }

  private getExpiresAtFromStreamUrl(url: string): Maybe<{
    date: number;
    ttl: number;
  }> {
    try {
      const SOUNDCLOUD_APPROX_TTL = 4 * 60;

      return {
        date: Date.now() + SOUNDCLOUD_APPROX_TTL * 1000,
        ttl: SOUNDCLOUD_APPROX_TTL,
      };

      // const urlInstance = new URL(url);
      // const expiresParam = urlInstance.searchParams.get('expires');

      // if (expiresParam) {
      //   const parsed = parseInt(expiresParam, 10);

      //   if (Number.isFinite(parsed)) {
      //     const now = Math.floor(Date.now() / 1000);
      //     const parsedTTL = Math.max(0, parsed - now);
      //     const refreshMargin = Math.floor(Math.min(300, parsedTTL * 0.1));
      //     const ttl = Math.max(0, parsedTTL - refreshMargin);

      //     return {
      //       date: (parsed - refreshMargin) * 1000,
      //       ttl,
      //     };
      //   }
      // }

      // {
      //   const policy = urlInstance.searchParams.get('Policy');
      //   const decoded = Buffer.from(policy, 'base64url').toString('utf8');
      //   const match = decoded.match(/"AWS:EpochTime":(\d+)/);

      //   if (match) {
      //     const parsed = parseInt(match?.[1], 10);

      //     if (Number.isFinite(parsed)) {
      //       const now = Math.floor(Date.now() / 1000);
      //       const parsedTTL = Math.max(0, parsed - now);
      //       const refreshMargin = Math.floor(Math.min(120, parsedTTL * 0.1));
      //       const ttl = Math.max(0, parsedTTL - refreshMargin);

      //       return {
      //         date: (parsed - refreshMargin) * 1000,
      //         ttl,
      //       };
      //     }
      //   }
      // }
    } catch (error) {
      this.logger.debug(error);
    }

    return null;
  }

  async getCurrentTrack(): Promise<CurrentTrackResponse> {
    await this.updateTokens();

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

  async resolveUrlWithInternalType({
    url,
  }: {
    url: string;
  }): Promise<FullTrackResponse> {
    const response = await this.resolveUrl({ url });

    return this._createTrack(response);
  }

  async getFullTrack(data: { id: string }): Promise<FullTrackResponse> {
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
      if (track.release_year && track.release_month && track.release_day) {
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

  async searchPlaylistsRaw({
    search,
    options,
  }: {
    search: string;
    options?: SoundCloudMusicServiceSearchOptions;
  }): Promise<SearchPlaylistsResponse> {
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const response = await this.api.get<SoundcloudApiSearchPlaylists>(
      '/playlists',
      {
        params: {
          q: search,
          access: this.transformAccessType(options?.access),
          linked_partitioning: true,
          show_tracks: false,
          ...pagination,
          limit,
          offset,
        },
      },
    );

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      playlists: response.data?.collection || [],
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

  async searchUsers({
    search,
    options,
  }: {
    search: string;
    options?: MusicServiceSearchOptions;
  }): Promise<SearchUsersResponse> {
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const response = await this.api.get<SoundcloudApiSearchUsers>('/users', {
      params: {
        q: search,
        linked_partitioning: true,
        ...pagination,
        limit,
        offset,
      },
    });

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      users: response.data?.collection || [],
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

  async searchTracks({
    search,
    options,
  }: {
    search: string;
    options?: MusicServiceSearchOptions;
  }): Promise<SearchResponse> {
    const response = await this.searchTracksRaw({
      search,
      options: {
        ...options,
        access: [
          SoundCloudAccessType.PLAYABLE,
          SoundCloudAccessType.PREVIEW,
          SoundCloudAccessType.BLOCKED,
        ],
      },
    });

    const tracks = response.tracks.map((track) => this._createTrack(track));

    return {
      tracks,
      pagination: response.pagination,
    };
  }

  async searchTracksRaw({
    search,
    options,
  }: {
    search: string;
    options?: SoundCloudMusicServiceSearchOptions;
  }): Promise<SearchResponseRaw<SoundCloudTrack>> {
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const response = await this.api.get<SoundcloudApiSearchTracks>('/tracks', {
      params: {
        q: search,
        access: this.transformAccessType(options?.access),
        linked_partitioning: true,
        ...pagination,
        limit,
        offset,
      },
    });

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      tracks: response.data?.collection || [],
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

  async getArtistRaw({
    artistId,
  }: {
    artistId: SoundCloudUser['urn'];
  }): Promise<SoundCloudUser> {
    if (!artistId) {
      throw new BadRequestException('Missing Artist ID');
    }

    await this.updateTokens();

    const response = await this.api.get<SoundCloudUser>(`/users/${artistId}`);

    return response.data;
  }

  async getArtistPlaylistsRaw({
    artistId,
    options,
  }: {
    artistId: SoundCloudUser['urn'];
    options?: SoundCloudMusicServiceSearchOptions;
  }): Promise<ArtistPlaylistsResponse> {
    if (!artistId) {
      throw new BadRequestException('Missing Artist ID');
    }
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const paginationNextParams = options?.pagination?.next
      ? Object.fromEntries(
          new URL(options.pagination.next).searchParams.entries(),
        )
      : {
          limit,
          offset,
        };

    const response = await this.api.get<SoundcloudApiArtistPlaylists>(
      `/users/${artistId}/playlists`,
      {
        params: {
          ...paginationNextParams,
          access: this.transformAccessType(options?.access),
          linked_partitioning: true,
          show_tracks: false,
        },
      },
    );

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      items: response.data?.collection || [],
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

  private transformAccessType = (typesArray: Maybe<SoundCloudAccessType[]>) => {
    const types = !!typesArray?.length
      ? typesArray
      : [SoundCloudAccessType.PLAYABLE, SoundCloudAccessType.PREVIEW];

    return types.join(',');
  };

  async getArtistTracksRaw({
    artistId,
    options,
  }: {
    artistId: SoundCloudUser['urn'];
    options?: SoundCloudMusicServiceSearchOptions;
  }): Promise<ArtistTracksResponse> {
    if (!artistId) {
      throw new BadRequestException('Missing Artist ID');
    }
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const paginationNextParams = options?.pagination?.next
      ? Object.fromEntries(
          new URL(options.pagination.next).searchParams.entries(),
        )
      : {
          limit,
          offset,
        };

    const response = await this.api.get<SoundcloudApiArtistTracks>(
      `/users/${artistId}/tracks`,
      {
        params: {
          ...paginationNextParams,
          access: this.transformAccessType(options?.access),
          linked_partitioning: true,
        },
      },
    );

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      items: response.data?.collection || [],
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

  async getPLaylistRaw({
    playlistId,
    options,
  }: {
    playlistId: SoundCloudPlaylist['urn'];
    options?: SoundCloudMusicServiceAccessOptions;
  }): Promise<SoundCloudPlaylist> {
    if (!playlistId) {
      throw new BadRequestException('Missing Playlist ID');
    }

    await this.updateTokens();

    const response = await this.api.get<SoundCloudPlaylist>(
      `/playlists/${playlistId}`,
      {
        params: {
          access: this.transformAccessType(options?.access),
          linked_partitioning: true,
        },
      },
    );

    return response.data;
  }

  async getPLaylistItemsRaw({
    playlistId,
    options,
  }: {
    playlistId: SoundCloudPlaylist['urn'];
    options?: SoundCloudMusicServiceSearchOptions;
  }): Promise<PaginatedResponse<SoundCloudTrack>> {
    await this.updateTokens();
    const pagination = options?.pagination || {};
    const limit = parseInt(pagination?.limit || PAGINATION_DEFAULTS.limit, 10);
    const offset = parseInt(
      pagination?.offset || PAGINATION_DEFAULTS.offset,
      10,
    );

    const response = await this.api.get<SoundcloudApiSearchTracks>(
      `/playlists/${playlistId}/tracks`,
      {
        params: {
          access: this.transformAccessType(options?.access),
          linked_partitioning: true,
          ...pagination,
          limit,
          offset,
        },
      },
    );

    const nextUrl = response.data.next_href
      ? new URL(response.data.next_href)
      : null;

    return {
      items: response.data?.collection || [],
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
