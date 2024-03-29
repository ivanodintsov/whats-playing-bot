import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Spotify, SpotifyDocument } from 'src/schemas/spotify.schema';
import { Model } from 'mongoose';
import { TokensService } from './tokens/tokens.service';
import { PREMIUM_REQUIRED } from './constants';
import { SearchOptions, SpotifyItem } from './types';
import { TrackEntity } from 'src/domain/Track';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';

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

    throw error;
  }
};

@Injectable()
export class SpotifyService {
  constructor(
    private appConfig: ConfigService,
    @InjectModel(Spotify.name) private spotifyModel: Model<SpotifyDocument>,
    private readonly tokens: TokensService,
  ) {}

  async createLoginUrl(redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    return spotifyApi.createAuthorizeURL(scopes, null);
  }

  async saveTokens(data) {
    const spotify = new this.spotifyModel(data);
    await spotify.save();
    return spotify;
  }

  async getTokens(data) {
    const tokens = await this.spotifyModel.findOne(data);
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

  async updateTokens(data) {
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
          ...tokens.toObject(),
          ...body,
        };
      }

      return tokens.toObject();
    } catch (error) {
      const errorName = R.path(['body', 'error'], error);

      if (errorName === 'invalid_grant') {
        await this.removeByTgId(data.tg_id);
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

  async removeByTgId(tgId: string) {
    return this.spotifyModel.deleteMany({
      tg_id: tgId,
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
    const response = await this._getTrack(id, tokens);
    const track = this.createTrack(response.body);

    return {
      track,
      response,
    };
  }

  async getFullTrack({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const response = await this._getTrack(id, tokens);

    return {
      track: { ...response.body },
      response,
    };
  }

  async getAlbum({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getAlbum(id);

    return {
      album: { ...response.body },
      response: { ...response },
    };
  }

  async getArtist({ user, id }: { user: User; id: any }) {
    const tokens = await this.updateTokens(user);
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    const response = await spotifyApi.getArtist(id);

    return {
      artist: { ...response.body },
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

type TelegramUser = {
  tg_id: number;
};
type User = TelegramUser;
