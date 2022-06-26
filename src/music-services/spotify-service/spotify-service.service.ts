import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as R from 'ramda';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { Model } from 'mongoose';
import {
  MusicServiceCoreService,
  User,
} from '../music-service-core/music-service-core.service';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { Spotify, SpotifyDocument } from 'src/schemas/spotify.schema';

import { SearchOptions, SpotifyItem } from './types';
import { TrackEntity } from 'src/domain/Track';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoTrackError,
} from 'src/errors';
import { SpotifyErrorHandler } from './spotify.error-handler';
import { PLAY_ACTIONS } from '../music-service-core/constants';

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
export class SpotifyServiceService extends MusicServiceCoreService {
  type = 'spotify';
  serviceName = 'Spotify';

  constructor(
    private appConfig: ConfigService,
    @InjectModel(Spotify.name) private spotifyModel: Model<SpotifyDocument>,
  ) {
    super();
  }

  async createLoginUrl(data: { redirectUri?: string } = {}) {
    const { redirectUri } = data;

    const spotifyApi = this.createSpotifyApi(redirectUri);
    return spotifyApi.createAuthorizeURL(scopes, null);
  }

  async createAndSaveTokens(data: {
    query: SpotifyCallbackDto;
    user: User;
    redirectUri?: string;
  }) {
    const { query, user, redirectUri } = data;

    const spotifyApi = this.createSpotifyApi(redirectUri);
    const response = await spotifyApi.authorizationCodeGrant(query.code);

    await this.saveTokens({
      ...response.body,
      ...user,
    });

    return { ...response.body };
  }

  async saveTokens(data) {
    const spotify = new this.spotifyModel(data);
    await spotify.save();
    return spotify;
  }

  async getTokens({ user }: { user: User }) {
    const tokens = await this.spotifyModel.findOne(user);
    return tokens;
  }

  async previousTrack(data: { user: User }) {
    const tokens = await this.updateTokens(data);
    await this._previousTrack(tokens);

    return {
      type: this.type,
    };
  }

  async nextTrack(data: { user: User }) {
    const tokens = await this.updateTokens(data);
    await this._nextTrack(tokens);

    return {
      type: this.type,
    };
  }

  async playSong(data: { user: User; uri: string }) {
    const { uri } = data;
    const tokens = await this.updateTokens(data);
    await this._addToQueue(tokens, uri);
    await this._nextTrack(tokens);

    return {
      type: this.type,
    };
  }

  async getTrack(data: { user: User; id: any }) {
    const { id } = data;
    const tokens = await this.updateTokens(data);
    const response = await this._getTrack(id, tokens);
    const track = this.createTrack(response.body);

    return {
      type: this.type,
      data: track,
      response,
    };
  }

  async getProfile(data: { user: User }) {
    const tokens = await this.updateTokens(data);
    const response = await this._getProfile(tokens);

    return {
      type: this.type,
      response,
      data: {
        name: response.body.display_name,
        url: response.body?.external_urls?.spotify,
      },
    };
  }

  async getCurrentTrack(data: { user: User }) {
    const tokens = await this.updateTokens(data);
    const response = await this.getMyCurrentPlayingTrack(tokens);
    const track = this.createTrack(response.body.item);

    return {
      type: this.type,
      data: track,
      response,
    };
  }

  async addToQueue(data: { user: User; uri: string }) {
    const { uri } = data;

    const tokens = await this.updateTokens(data);
    await this._addToQueue(tokens, uri);

    return { type: this.type };
  }

  async searchTracks(data: {
    user: User;
    search: string;
    options?: SearchOptions;
  }) {
    const { search, options } = data;

    const tokens = await this.updateTokens(data);
    const response = await this._searchTracks(tokens, search, options);

    return {
      type: this.type,
      ...response,
    };
  }

  @SpotifyErrorHandler()
  async toggleFavorite(data: { trackIds: [string]; user: User }) {
    const { trackIds } = data;

    const tokens = await this.updateTokens(data);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);

    const saved = await spotifyApi.containsMySavedTracks(trackIds);
    const [isContains] = saved.body;

    if (isContains) {
      const response = await spotifyApi.removeFromMySavedTracks(trackIds);

      return {
        type: this.type,
        response: { ...response },
        action: 'removed',
      };
    }

    const response = await spotifyApi.addToMySavedTracks(trackIds);

    return {
      type: this.type,
      response: { ...response },
      action: 'saved',
    };
  }

  @SpotifyErrorHandler()
  async togglePlay(data: { user: User }) {
    const tokens = await this.updateTokens(data);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);

    const currentState = await spotifyApi.getMyCurrentPlaybackState();

    if (currentState.body.is_playing) {
      await spotifyApi.pause();

      return {
        type: this.type,
        response: { ...currentState },
        action: PLAY_ACTIONS.PAUSED,
      };
    }

    await spotifyApi.play();

    return {
      type: this.type,
      response: { ...currentState },
      action: PLAY_ACTIONS.PLAYING,
    };
  }

  protected async updateTokens(data: { user: User }) {
    const tokens = await this.getTokens(data);

    if (!tokens) {
      throw new NoMusicServiceError();
    }

    try {
      if (new Date().getTime() / 1000 >= tokens.expires_date) {
        const { body } = await this.refreshTokens(tokens);

        await this.spotifyModel.updateOne(
          {
            _id: tokens._id,
          },
          {
            ...body,
            expires_date: new Date().getTime() / 1000 + body.expires_in / 2,
          },
        );

        return {
          access_token: body.access_token,
          refresh_token: body.refresh_token,
          token_type: body.token_type,
          expires_in: body.expires_in,
          scope: body.scope,
        };
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
      };
    } catch (error) {
      const errorName = R.path(['body', 'error'], error);

      if (errorName === 'invalid_grant') {
        await tokens.remove();
        throw new ExpiredMusicServiceTokenError();
      }

      throw error;
    }
  }

  async remove({ user }: { user: User }) {
    if (R.isEmpty(user) || R.isNil(user)) {
      throw new Error('User is empty');
    }

    await this.spotifyModel.deleteMany(user);

    return {
      type: this.type,
    };
  }

  @SpotifyErrorHandler()
  private async _addToQueue(tokens, uri) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.addToQueue(uri);
    return { ...response };
  }

  private setTokens(api, tokens) {
    api.setAccessToken(tokens.access_token);
    api.setRefreshToken(tokens.refresh_token);
  }

  private createTrack(item: SpotifyItem): TrackEntity {
    const url = item?.external_urls?.spotify;

    if (!url || item?.type !== 'track') {
      throw new NoTrackError();
    }

    const thumb = item.album?.images?.[0];
    const artistsList = item.artists || [];
    const artistsString = artistsList.map(artist => artist.name).join(', ');
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

  private createSpotifyApi(redirectUri?: string) {
    return new SpotifyApi({
      redirectUri:
        redirectUri || this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET'),
    });
  }

  @SpotifyErrorHandler()
  private async _previousTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.skipToPrevious();
    return { ...response };
  }

  @SpotifyErrorHandler()
  private async _nextTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.skipToNext();
    return { ...response };
  }

  private async refreshTokens(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.refreshAccessToken();
  }

  private async _getTrack(id, tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getTrack(id);
    return { ...response };
  }

  private async getMyCurrentPlayingTrack(tokens) {
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
      data: tracks,
      response: { ...response },
      pagination: {
        offset: `${response.body.tracks.offset}`,
        next: response.body.tracks.next,
      },
    };
  }
}