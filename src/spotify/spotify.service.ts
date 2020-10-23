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
    this.tokens.processTokens(spotify);
    return spotify;
  }

  getTokens (data) {
    return this.spotifyModel.findOne(data);
  }

  async createAndSaveTokens (query: SpotifyCallbackDto, redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    const response = await spotifyApi.authorizationCodeGrant(query.code);
    return response.body;
  }

  private async refreshTokens (tokens) {
    const spotifyApi = this.createSpotifyApi();
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    return spotifyApi.refreshAccessToken();
  }

  async updateTokens (data) {
    const tokens = await this.getTokens(data);
    const { body } = await this.refreshTokens(tokens);
    await this.spotifyModel.updateOne({
      _id: tokens._id,
    }, body);
    return {
      ...tokens.toObject(),
      ...body,
    };
  }

  async getMyCurrentPlayingTrack (tokens) {
    const spotifyApi = this.createSpotifyApi();
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    return spotifyApi.getMyCurrentPlayingTrack();
  }

  async getProfile (tokens) {
    const spotifyApi = this.createSpotifyApi();
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    return spotifyApi.getMe();
  }

  private createSpotifyApi (redirectUri?: string) {
    return new SpotifyApi({
      redirectUri: redirectUri || this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET')
    });
  }
}
