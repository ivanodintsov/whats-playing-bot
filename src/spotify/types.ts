import SpotifyApi from 'spotify-web-api-node';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

export const SpotifyItemTypes = {
  TRACK: 'track',
  EPISODE: 'episode',
};

export type SpotifyItem = Awaited<
  ReturnType<SpotifyApi['getMyCurrentPlayingTrack']>
>['body']['item'];

export type PaginationOptions = {
  offset?: number;
  limit?: number;
};

export type SearchOptions = {
  pagination?: PaginationOptions;
};

export type FindTokensProps = {
  userId: string;
  provider: CLIENT_UNIQUE_PROVIDES;
};

export type SpotifyCreateTokensProps = FindTokensProps &
  Awaited<ReturnType<SpotifyApi['authorizationCodeGrant']>>['body'];

export type User = FindTokensProps;
