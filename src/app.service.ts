import { Injectable } from '@nestjs/common';
import * as SpotifyApi from 'spotify-web-api-node';
import { ConfigService } from '@nestjs/config';
import { SpotifyCallbackDto } from './spotify-callback.dto';

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
export class AppService {
  constructor (private appConfig: ConfigService) {}

  async getHello(): Promise<string> {
    const spotifyApi = this.createSpotifyApi();
    console.log(spotifyApi)
    return 'Hello World!';
  }

  async createLoginUrl() {
    const spotifyApi = this.createSpotifyApi();
    return spotifyApi.createAuthorizeURL(scopes);
  }

  async refreshToken() {
    const spotifyApi = this.createSpotifyApi();
    return spotifyApi.createAuthorizeURL(scopes);
  }

  saveTokens (tokens) {
    users[1] = {
      ...users[1],
      ...tokens,
    };
  }

  getTokens () {
    const spotifyApi = this.createSpotifyApi();
    spotifyApi.setAccessToken(users[1].access_token);
    spotifyApi.setRefreshToken(users[1].refresh_token);
    return spotifyApi.getMyCurrentPlaybackState();
  }

  async createAndSaveTokens (query: SpotifyCallbackDto) {
    const spotifyApi = this.createSpotifyApi();
    const response = await spotifyApi.authorizationCodeGrant(query.code);
    this.saveTokens(response.body);
  }

  private createSpotifyApi () {
    return new SpotifyApi({
      redirectUri: this.appConfig.get<string>('SPOTIFY_REDIRECT_URL'),
      clientId: this.appConfig.get<string>('SPOTIFY_CLIENT_ID'),
      clientSecret: this.appConfig.get<string>('SPOTIFY_CLIENT_SECRET')
    });
  }
}
