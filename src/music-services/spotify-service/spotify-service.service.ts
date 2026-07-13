import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as R from 'ramda';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { parse } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { SpotifyCreateTokensProps, SpotifyItem } from './types';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoTrackError,
} from 'src/errors';
import { Logger } from 'src/logger';
import { InjectModel } from '@nestjs/sequelize';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';
import {
  MusicServiceToken,
  MusicServiceTokenDomain,
} from 'src/music-services/models/music-service-token.model';
import {
  FindMusicServiceTokensProps,
  MusicServiceSearchOptions,
  ArtistAlbumsResponse,
  SearchResponse,
  MusicServiceContextOptions,
  LINK_TYPE,
} from 'src/music-services/music-service-core/types';
import { MusicServiceCoreService } from '../music-service-core/music-service-core.service';
import { SpotifyErrorHandler } from './spotify.error-handler';
import {
  ALBUM_TYPE,
  IAlbum,
  IArtist,
  IGenre,
  ITrack,
  RELEASE_DATE_PRECISION,
  SONG_TYPE,
} from '../music-service-core/types';
import { SpotifyURI } from '../music-services-uri-parser/types';
import {
  PAGINATION_DEFAULTS,
  TOGGLE_ACTIONS,
} from '../music-service-core/constants';

const scopes = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'user-top-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify',
];

@Injectable()
export class SpotifyService extends MusicServiceCoreService {
  type = MUSIC_SERVICE_PROVIDERS.SPOTIFY;
  serviceName = 'Spotify';

  private readonly logger = new Logger(SpotifyService.name);
  private api: SpotifyApi;
  private user: FindMusicServiceTokensProps;
  private tokens: MusicServiceTokenDomain;
  private redirectUri?: string;

  constructor(
    private appConfig: ConfigService,
    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
  ) {
    super();
  }

  async connect(ctx: MusicServiceContextOptions) {
    const service = new SpotifyService(
      this.appConfig,
      this.musicServiceTokenModel,
    );

    service.api = service._createSpotifyApi();
    service.user = ctx.user;
    service.redirectUri = ctx.redirectUrl;

    if (ctx.tokens) {
      service._setTokens(ctx.tokens);
    }

    await service.updateTokens();
    return service;
  }

  async createLoginUrl() {
    const state = crypto.randomBytes(64).toString('base64url');
    const api = this._createSpotifyApi();

    return {
      url: api.createAuthorizeURL(scopes, state),
      rest: { state },
    };
  }

  async saveTokens({ obtainDate, ...data }: SpotifyCreateTokensProps) {
    const tokens = new this.musicServiceTokenModel({
      ...data,
      expires_date: this._getExpiresDate(obtainDate, data.expires_in),
      service: this.type,
    });
    await tokens.save();
    return tokens;
  }

  // TODO: Remove method
  async createTokens(
    data: SpotifyCreateTokensProps & {
      expires_date: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const spotify = new this.musicServiceTokenModel(data);
    spotify.service = MUSIC_SERVICE_PROVIDERS.SPOTIFY;
    await spotify.save();
    return spotify;
  }

  private _getExpiresDate(obtainDate: Date, expiresIn: number) {
    return Math.floor(obtainDate.getTime() / 1000) + expiresIn;
  }

  async getTokens({ userId, provider }: FindMusicServiceTokensProps) {
    const tokens = await this.musicServiceTokenModel.findOne({
      where: { userId, provider, service: this.type },
    });
    return tokens;
  }

  async createAndSaveTokens(
    query: SpotifyCallbackDto,
    rest: any,
    data: Pick<SpotifyCreateTokensProps, 'obtainDate' | 'userId' | 'provider'>,
  ) {
    const api = this._createSpotifyApi();
    const response = await api.authorizationCodeGrant(query.code);
    const tokensResponse = response.body;

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

  private async _refreshTokens() {
    return this.api.refreshAccessToken();
  }

  async updateTokens() {
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
        const { body } = await this._refreshTokens();
        const expiresDate = this._getExpiresDate(
          obtainTokensDate,
          body.expires_in,
        );

        await this.musicServiceTokenModel.update(
          {
            ...body,
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
          ...body,
          expires_date: expiresDate,
        };

        this._setTokens(data);

        return data;
      }

      return this.tokens;
    } catch (error) {
      const errorName = R.path(['body', 'error'], error);

      this.logger.error(errorName, error.message, error.stack, error);

      if (errorName === 'invalid_grant') {
        await this.removeTokens();
        throw new ExpiredMusicServiceTokenError();
      }

      throw error;
    }
  }

  private async _getProfile() {
    await this.updateTokens();
    const { body } = await this.api.getMe();

    return {
      id: body.id,
      username: body.display_name,
      uri: body.uri,
      url: body.external_urls.spotify,
    };
  }

  private async _searchTracks(
    search: string,
    options?: MusicServiceSearchOptions,
  ): Promise<SearchResponse> {
    await this.updateTokens();
    const response = await this.api.searchTracks(search, {
      offset: parseInt(
        options?.pagination?.offset || PAGINATION_DEFAULTS.offset,
        10,
      ),
      limit: parseInt(
        options?.pagination?.limit || PAGINATION_DEFAULTS.limit,
        10,
      ),
    });
    const tracks = response.body.tracks.items.map((item) =>
      this._createTrack(item),
    );

    return {
      tracks,
      pagination: {
        offset: response.body.tracks.offset.toString(),
        next: response.body.tracks.next,
      },
    };
  }

  @SpotifyErrorHandler()
  private async _playSong(uri) {
    await this.updateTokens();
    const response = await this.api.play({
      uris: [uri],
    });
    return { ...response };
  }

  private _createSpotifyApi() {
    return new SpotifyApi({
      redirectUri:
        this.redirectUri ||
        this.appConfig.get<string>('CONNECT_MUSIC_SERVICE_CALLBACK_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET'),
    });
  }

  private _setTokens(tokens: MusicServiceTokenDomain) {
    this.tokens = tokens;
    this.user = {
      userId: tokens.userId,
      provider: tokens.provider,
    };
    this.api.setAccessToken(tokens.access_token);
    this.api.setRefreshToken(tokens.refresh_token);
  }

  async removeTokens() {
    await this.musicServiceTokenModel.destroy({
      where: {
        userId: this.user.userId,
        provider: this.user.provider,
        service: this.type,
      },
    });
  }

  @SpotifyErrorHandler()
  async getCurrentTrack() {
    await this.updateTokens();
    const response = await this.api.getMyCurrentPlayingTrack();
    return this._createTrack(response.body.item);
  }

  @SpotifyErrorHandler()
  async getTrack({ id }: { id: any }) {
    await this.updateTokens();
    const response = await this.api.getTrack(id);
    return this._createTrack(response.body);
  }

  @SpotifyErrorHandler()
  async getFullTrack({ id }: { id: any }) {
    await this.updateTokens();
    const response = await this.api.getTrack(id);
    return this._createTrack(response.body);
  }

  @SpotifyErrorHandler()
  async getAlbum({ id }: { id: any }) {
    await this.updateTokens();
    const response = await this.api.getAlbum(id);
    return this._createAlbum(response.body);
  }

  @SpotifyErrorHandler()
  async getArtist({ id }: { id: any }) {
    await this.updateTokens();
    const response = await this.api.getArtist(id);
    return this._createArtist(response.body);
  }

  @SpotifyErrorHandler()
  async getArtistAlbums({
    id,
    options,
  }: {
    id: any;
    options?: MusicServiceSearchOptions;
  }): Promise<ArtistAlbumsResponse> {
    await this.updateTokens();
    const { body } = await this.api.getArtistAlbums(id, {
      offset: parseInt(
        options?.pagination?.offset || PAGINATION_DEFAULTS.offset,
        10,
      ),
      limit: parseInt(
        options?.pagination?.limit || PAGINATION_DEFAULTS.limit,
        10,
      ),
    });

    return {
      items: body.items.map((item) => this._createAlbumSimple(item)),
      pagination: {
        next: body.next,
        offset: body.offset.toString(),
      },
    };
  }

  @SpotifyErrorHandler()
  async getAlbumTracks({
    id,
    options,
  }: {
    id: any;
    options?: MusicServiceSearchOptions;
  }) {
    await this.updateTokens();
    const { body } = await this.api.getAlbumTracks(id, {
      offset: parseInt(
        options?.pagination?.offset || PAGINATION_DEFAULTS.offset,
        10,
      ),
      limit: parseInt(
        options?.pagination?.limit || PAGINATION_DEFAULTS.limit,
        10,
      ),
    });

    return {
      items: body.items.map((item) => this._createTrackSimple(item)),
      pagination: {
        next: body.next,
        offset: body.offset.toString(),
      },
    };
  }

  async previousTrack() {
    await this.updateTokens();
    await this.api.skipToPrevious();
  }

  async nextTrack() {
    await this.updateTokens();
    await this.api.skipToNext();
  }

  @SpotifyErrorHandler()
  async toggleFavorite({ uris }: { uris: [SpotifyURI] }) {
    const toggle = async () => {
      await this.updateTokens();

      const trackIds = uris.map((uri) => uri.uri.id);
      const saved = await this.api.containsMySavedTracks(trackIds);
      const [isContains] = saved.body;

      if (isContains) {
        await this.api.removeFromMySavedTracks(trackIds);
        return { action: TOGGLE_ACTIONS.REMOVED };
      }

      await this.api.addToMySavedTracks(trackIds);
      return { action: TOGGLE_ACTIONS.SAVED };
    };

    return toggle();
  }

  @SpotifyErrorHandler()
  async togglePlay() {
    const toggle = async () => {
      await this.updateTokens();

      const currentState = await this.api.getMyCurrentPlaybackState();

      if (currentState.body.is_playing) {
        await this.api.pause();

        return {
          action: 'paused',
        };
      }

      await this.api.play();

      return {
        action: 'playing',
      };
    };

    return toggle();
  }

  private createSpotifyUri(uri: SpotifyURI) {
    return `spotify:${uri.uri.type}:${uri.uri.id}`;
  }

  @SpotifyErrorHandler()
  async playSong({ uri }: { uri: SpotifyURI }) {
    await this.updateTokens();
    await this.api.addToQueue(this.createSpotifyUri(uri));
    await this.api.skipToNext();
  }

  @SpotifyErrorHandler()
  async addToQueue({ uri }: { uri: SpotifyURI }) {
    await this.updateTokens();
    await this.api.addToQueue(this.createSpotifyUri(uri));
  }

  @SpotifyErrorHandler()
  async getProfile() {
    await this.updateTokens();
    return this._getProfile();
  }

  @SpotifyErrorHandler()
  async searchTracks({
    search,
    options,
  }: {
    search: string;
    options?: MusicServiceSearchOptions;
  }) {
    await this.updateTokens();
    return this._searchTracks(search, options);
  }

  private _createTrackSimple(
    track: SpotifyApi.TrackObjectSimplified | SpotifyApi.EpisodeObject,
  ): ITrack {
    if (!track || track.type !== 'track') {
      throw new NoTrackError();
    }

    return {
      id: track.id,
      name: track.name,
      type: SONG_TYPE.track,
      trackNumber: track.track_number,
      links: [
        {
          providerUrl: track.external_urls.spotify,
          provider: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
          providerId: track.id,
          type: LINK_TYPE.TRACK,
        },
      ],
      duration: track.duration_ms,
      explicit: track.explicit,

      artists: null,
      album: null,
      isrc: null,
      upc: null,
      ean: null,
    };
  }

  private _createTrack(
    track: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObject,
  ): ITrack {
    if (!track || track.type !== 'track') {
      throw new NoTrackError();
    }

    return {
      ...this._createTrackSimple(track),
      artists: track.artists.map((item) => this._createArtistSimple(item)),
      album: this._createAlbumSimple(track.album),
      isrc: track.external_ids.isrc && [track.external_ids.isrc],
      upc: track.external_ids.upc && [track.external_ids.upc],
      ean: track.external_ids.ean && [track.external_ids.ean],
    };
  }

  private _createAlbumSimple(album: SpotifyApi.AlbumObjectSimplified): IAlbum {
    const artists: IArtist[] = [];

    for (let i = 0; i < album.artists.length; i++) {
      const artist = album.artists[i];
      artists.push(this._createArtistSimple(artist));
    }

    let releaseDate: Date;

    try {
      switch (album.release_date_precision) {
        case RELEASE_DATE_PRECISION.year:
          releaseDate = parse(album.release_date, 'yyyy', new Date());
          break;

        case RELEASE_DATE_PRECISION.month:
          releaseDate = parse(album.release_date, 'yyyy-MM', new Date());
          break;

        case RELEASE_DATE_PRECISION.day:
          releaseDate = parse(album.release_date, 'yyyy-MM-dd', new Date());
          break;

        default:
          break;
      }

      // if (releaseDate) {
      //   releaseDate = new Date(
      //     releaseDate.valueOf() + releaseDate.getTimezoneOffset() * 60 * 1000,
      //   );
      // }
    } catch (error) {}

    const images = album.images?.sort?.(
      (img1, img2) => img2.width - img1.width,
    );

    return {
      id: album.id,
      albumType: ALBUM_TYPE[album.album_type],
      availableMarkets: album.available_markets,
      totalTracks: album.total_tracks,
      artists,
      links: [
        {
          providerUrl: album.external_urls.spotify,
          provider: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
          providerId: album.id,
          type: LINK_TYPE.ALBUM,
        },
      ],
      image: images.length
        ? {
            height: images[0].height,
            width: images[0].width,
            url: images[0].url,
            medium: images[1] && {
              height: images[1].height,
              width: images[1].width,
              url: images[1].url,
            },
            small: images[2] && {
              height: images[2].height,
              width: images[2].width,
              url: images[2].url,
            },
          }
        : null,
      name: album.name,
      releaseDate,

      isrc: null,
      upc: null,
      ean: null,
    };
  }

  private _createAlbum(album: SpotifyApi.AlbumObjectFull): IAlbum {
    return {
      ...this._createAlbumSimple(album),
      isrc: album.external_ids.isrc && [album.external_ids.isrc],
      upc: album.external_ids.upc && [album.external_ids.upc],
      ean: album.external_ids.ean && [album.external_ids.ean],
    };
  }

  private _createArtistSimple(
    artist: SpotifyApi.ArtistObjectSimplified,
  ): IArtist {
    return {
      id: artist.id,
      name: artist.name,
      links: [
        {
          providerUrl: artist.external_urls.spotify,
          providerId: artist.id,
          provider: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
          type: LINK_TYPE.ARTIST,
        },
      ],

      genres: null,
      image: null,
    };
  }

  private _createArtist(artist: SpotifyApi.ArtistObjectFull): IArtist {
    let images: SpotifyApi.ImageObject[] = artist.images?.sort?.(
      (img1, img2) => img2.width - img1.width,
    );
    let genres: IGenre[] = this._getGenres(artist.genres);

    return {
      ...this._createArtistSimple(artist),
      genres,
      image: images.length
        ? {
            height: images[0].height,
            width: images[0].width,
            url: images[0].url,
            medium: images[1] && {
              height: images[1].height,
              width: images[1].width,
              url: images[1].url,
            },
            small: images[2] && {
              height: images[2].height,
              width: images[2].width,
              url: images[2].url,
            },
          }
        : null,
    };
  }

  private _getGenres(genres: string[]): IGenre[] {
    return (
      genres?.map?.((genre) => ({
        slug: genre,
      })) || []
    );
  }
}
