import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { TokensService } from './tokens/tokens.service';
import { PREMIUM_REQUIRED } from './constants';
import {
  FindTokensProps,
  SearchOptions,
  SpotifyCreateTokensProps,
  SpotifyItem,
  User,
} from './types';
import { TrackEntity } from './domain/Track';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';
import { Logger } from 'src/logger';
import { InjectModel } from '@nestjs/sequelize';
import { SpotifyToken } from './models/spotify-token.model';

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

const spotifyApiHandleErrorsLogger = new Logger('SpotifyApiHandleErrorsLogger');

const handleErrors = async <T extends Promise<any>>(
  promiseInstance: T,
): Promise<T> => {
  try {
    const response = await promiseInstance;
    return response;
  } catch (error) {
    const reason = R.path(['body', 'error', 'reason'], error);

    if (reason === PREMIUM_REQUIRED) {
      throw new NoServiceSubscriptionError();
    }

    spotifyApiHandleErrorsLogger.error(
      error.message,
      error.stack,
      JSON.stringify(error),
    );

    spotifyApiHandleErrorsLogger.error(
      R.path(['body', 'error'], error),
      R.path(['body', 'error', 'reason'], error),
    );

    throw error;
  }
};

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);

  constructor(
    private appConfig: ConfigService,

    @InjectModel(SpotifyToken)
    private spotifyTokenModel: typeof SpotifyToken,

    private readonly tokens: TokensService,
  ) {}

  async createLoginUrl(redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    return spotifyApi.createAuthorizeURL(scopes, null);
  }

  async saveTokens({ obtainDate, ...data }: SpotifyCreateTokensProps) {
    const spotify = new this.spotifyTokenModel({
      ...data,
      expires_date: this.getExpiresDate(obtainDate, data.expires_in),
    });
    await spotify.save();
    return spotify;
  }

  async createTokens(
    data: SpotifyCreateTokensProps & {
      expires_date: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const spotify = new this.spotifyTokenModel(data);
    await spotify.save();
    return spotify;
  }

  private getExpiresDate(obtainDate: Date, expiresIn: number) {
    return Math.floor(obtainDate.getTime() / 1000) + expiresIn;
  }

  async getTokens(data: FindTokensProps) {
    const tokens = await this.spotifyTokenModel.findOne({
      where: data,
    });
    return tokens;
  }

  async createAndSaveTokens(query: SpotifyCallbackDto, redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    const response = await spotifyApi.authorizationCodeGrant(query.code);

    return { ...response.body };
  }

  private async refreshTokens(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.refreshAccessToken();
  }

  async updateTokens(data: FindTokensProps) {
    const tokens = await this.getTokens(data);

    if (!tokens) {
      throw new NoMusicServiceError();
    }

    const REFRESH_MARGIN = 30;

    try {
      if (Date.now() / 1000 >= tokens.expires_date - REFRESH_MARGIN) {
        const obtainTokensDate = new Date();
        const { body } = await this.refreshTokens(tokens);

        await this.spotifyTokenModel.update(
          {
            ...body,
            expires_date: this.getExpiresDate(
              obtainTokensDate,
              body.expires_in,
            ),
          },
          {
            where: {
              id: tokens.id,
            },
          },
        );

        return {
          ...tokens.toJSON(),
          ...body,
        };
      }

      return tokens.toJSON();
    } catch (error) {
      const errorName = R.path(['body', 'error'], error);

      this.logger.error(errorName, error.message, error.stack, error);

      if (errorName === 'invalid_grant') {
        await this.removeByTgId(data);
        throw new ExpiredMusicServiceTokenError();
      }

      throw error;
    }
  }

  async getMyCurrentPlayingTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getMyCurrentPlayingTrack();
    return { ...response };
  }

  private async _getProfile(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getMe();
    return { ...response };
  }

  private async _searchTracks(tokens, search: string, options?: SearchOptions) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.searchTracks(search, {
      offset: options?.pagination?.offset,
      limit: options?.pagination?.limit,
    });
    const tracks = response.body.tracks.items.map(this.createTrack);

    return {
      tracks,
      response: { ...response },
      pagination: {
        offset: response.body.tracks.offset,
        next: response.body.tracks.next,
      },
    };
  }

  private async _previousTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(spotifyApi.skipToPrevious());
    return { ...response };
  }

  private async _nextTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(spotifyApi.skipToNext());
    return { ...response };
  }

  private async _playSong(tokens, uri) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(
      spotifyApi.play({
        uris: [uri],
      }),
    );
    return { ...response };
  }

  private async _addToQueue(tokens, uri) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(spotifyApi.addToQueue(uri));
    return { ...response };
  }

  private createSpotifyApi(redirectUri?: string) {
    return new SpotifyApi({
      redirectUri:
        redirectUri || this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET'),
    });
  }

  private setTokens(api, tokens) {
    api.setAccessToken(tokens.access_token);
    api.setRefreshToken(tokens.refresh_token);
  }

  async removeByTgId({ userId, provider }: FindTokensProps) {
    return this.spotifyTokenModel.destroy({
      where: {
        userId,
        provider,
      },
    });
  }

  private async _getTrack(id, tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getTrack(id);
    return { ...response };
  }

  private createTrack(item: SpotifyItem): TrackEntity {
    const url = item?.external_urls?.spotify;

    if (!url || item?.type !== 'track') {
      throw new NoTrackError();
    }

    const thumb = item.album?.images?.sort?.(
      (img1, img2) => img2.width - img1.width,
    )?.[0];
    const artistsList = item.artists || [];
    const artistsString = artistsList.map((artist) => artist.name).join(', ');
    const uri = item.uri;

    const track = new TrackEntity({
      id: uri,
      name: item.name || '',
      url,
      thumb_url: thumb?.url,
      thumb_width: thumb?.width,
      thumb_height: thumb?.height,
      artists: artistsString,
    });

    return track;
  }

  async getCurrentTrack({ user }: { user: User }) {
    const tokens = await this.updateTokens(user);
    const response = await this.getMyCurrentPlayingTrack(tokens);
    const track = this.createTrack(response.body.item);

    return {
      track,
      response,
    };
  }

  async getTrack({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const response = await handleErrors(this._getTrack(id, tokens));
    const track = this.createTrack(response.body);

    return {
      track,
      response,
    };
  }

  async getFullTrack({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const response = await handleErrors(this._getTrack(id, tokens));

    return {
      track: { ...response.body },
      response,
    };
  }

  async getAlbum({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(spotifyApi.getAlbum(id));

    return {
      album: { ...response.body },
      response: { ...response },
    };
  }

  async getArtist({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(spotifyApi.getArtist(id));

    return {
      artist: { ...response.body },
      response: { ...response },
    };
  }

  async getArtistAlbums({
    user,
    id,
    options,
  }: {
    user: User;
    id: any;
    options?: SearchOptions;
  }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await handleErrors(
      spotifyApi.getArtistAlbums(id, {
        offset: options?.pagination?.offset,
        limit: options?.pagination?.limit,
      }),
    );

    return {
      albums: { ...response.body },
      response: { ...response },
    };
  }

  async getAlbumTracks({
    user,
    id,
    options,
  }: {
    user: User;
    id: any;
    options?: SearchOptions;
  }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);

    const response = await handleErrors(
      spotifyApi.getAlbumTracks(id, {
        offset: options?.pagination?.offset,
        limit: options?.pagination?.limit,
      }),
    );

    return {
      tracks: { ...response.body },
      response: { ...response },
    };
  }

  async previousTrack(user: User) {
    const tokens = await this.updateTokens(user);
    return this._previousTrack(tokens);
  }

  async nextTrack(user: User) {
    const tokens = await this.updateTokens(user);
    return this._nextTrack(tokens);
  }

  async toggleFavorite({ trackIds, user }: { trackIds: [string]; user: User }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);

    const toggle = async () => {
      const saved = await spotifyApi.containsMySavedTracks(trackIds);
      const [isContains] = saved.body;

      if (isContains) {
        const response = await spotifyApi.removeFromMySavedTracks(trackIds);
        return { response: { ...response }, action: 'removed' };
      }

      const response = await spotifyApi.addToMySavedTracks(trackIds);
      return { response: { ...response }, action: 'saved' };
    };

    return handleErrors(toggle());
  }

  async togglePlay(user: User) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);

    const toggle = async () => {
      const currentState = await spotifyApi.getMyCurrentPlaybackState();

      if (currentState.body.is_playing) {
        await spotifyApi.pause();

        return {
          action: 'paused',
        };
      }

      await spotifyApi.play();

      return {
        action: 'playing',
      };
    };

    return handleErrors(toggle());
  }

  async playSong({ user, uri }: { user: User; uri: string }) {
    const tokens = await this.updateTokens(user);
    await this._addToQueue(tokens, uri);
    return this._nextTrack(tokens);
  }

  async addToQueue({ user, uri }: { user: User; uri: string }) {
    const tokens = await this.updateTokens(user);
    return this._addToQueue(tokens, uri);
  }

  async getProfile(user: User) {
    const tokens = await this.updateTokens(user);
    return this._getProfile(tokens);
  }

  async searchTracks({
    user,
    search,
    options,
  }: {
    user: User;
    search: string;
    options?: SearchOptions;
  }) {
    const tokens = await this.updateTokens(user);
    return this._searchTracks(tokens, search, options);
  }
}
