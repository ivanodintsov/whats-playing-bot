import { Injectable } from '@nestjs/common';
import * as SpotifyApi from 'spotify-web-api-node';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Spotify, SpotifyDocument } from 'src/schemas/spotify.schema';
import { Model } from 'mongoose';

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
  ) {}

  async createLoginUrl(redirectUri?: string) {
    const spotifyApi = this.createSpotifyApi(redirectUri);
    return spotifyApi.createAuthorizeURL(scopes);
  }

  async refreshToken() {
    const spotifyApi = this.createSpotifyApi();
    return spotifyApi.createAuthorizeURL(scopes);
  }

  async saveTokens (data) {
    const spotify = new this.spotifyModel(data);
    await spotify.save();
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

  async getMyCurrentPlayingTrack (tokens) {
    const spotifyApi = this.createSpotifyApi();
    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);
    return spotifyApi.getMyCurrentPlayingTrack();
  }

  private createSpotifyApi (redirectUri?: string) {
    return new SpotifyApi({
      redirectUri: redirectUri || this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET')
    });
  }
}
