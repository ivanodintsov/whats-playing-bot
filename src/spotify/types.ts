import SpotifyApi from 'spotify-web-api-node';

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

export const SpotifyItemTypes = {
  TRACK: 'track',
  EPISODE: 'episode',
};

export type SpotifyItem = Awaited<
  ReturnType<SpotifyApi['getMyCurrentPlayingTrack']>
>['body']['item'];
