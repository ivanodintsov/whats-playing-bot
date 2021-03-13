import { Injectable } from '@nestjs/common';
import * as SpotifyApi from 'spotify-web-api-node';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Spotify, SpotifyDocument } from 'src/schemas/spotify.schema';
import { Model } from 'mongoose';
import { TokensService } from './tokens/tokens.service';

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
  'user-follow-modify'
];

const users = {
  1: {
    access_token: '',
    refresh_token: '',
  }
};

@Injectable()
export class SpotifyService {
  constructor (
    private appConfig: ConfigService,
    @InjectModel(Spotify.name) private spotifyModel: Model<SpotifyDocument>,
    private readonly tokens: TokensService,
  ) {}

  async createLoginUrl(redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    return spotifyApi.createAuthorizeURL(scopes);
  }

  async saveTokens (data) {
    const spotify = new this.spotifyModel(data);
    await spotify.save();
    return spotify;
  }

  async getTokens (data) {
    const tokens = await this.spotifyModel.findOne(data);
    return tokens;
  }

  async createAndSaveTokens (query: SpotifyCallbackDto, redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    const response = await spotifyApi.authorizationCodeGrant(query.code);
    return response.body;
  }

  private async refreshTokens (tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.refreshAccessToken();
  }

  async updateTokens (data) {
    const tokens = await this.getTokens(data);
    
    if (!tokens) {
      return tokens;
    }

    if (new Date().getTime() / 1000 >= tokens.expires_date) {
      const { body } = await this.refreshTokens(tokens);

      await this.spotifyModel.updateOne({
        _id: tokens._id,
      }, {
        ...body,
        expires_date: new Date().getTime() / 1000 + body.expires_in / 2,
      });

      return {
        ...tokens.toObject(),
        ...body,
      };
    }

    return tokens.toObject();
  }

  async getMyCurrentPlayingTrack (tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.getMyCurrentPlayingTrack();
  }

  async getProfile (tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.getMe();
  }
  
  async previousTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.skipToPrevious();
  }

  async nextTrack(tokens) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.skipToNext();
  }

  async playSong(tokens, uri) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.play({
      uris: [uri],
    });
  }

  async addToQueue(tokens, uri) {
    const spotifyApi = this.createSpotifyApi();
    this.setTokens(spotifyApi, tokens);
    return spotifyApi.addToQueue(uri);
  }

  private createSpotifyApi (redirectUri?: string) {
    return new SpotifyApi({
      redirectUri: redirectUri || this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET')
    });
  }

  private setTokens(api, tokens) {
    api.setAccessToken(tokens.access_token);
    api.setRefreshToken(tokens.refresh_token);
  }

  async removeByTgId (tgId: string) {
    return this.spotifyModel.findOneAndDelete({
      tg_id: tgId,
    });
  }
}
