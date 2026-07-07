import SpotifyApi from 'spotify-web-api-node';
import { CreateMusicServiceTokensData } from 'src/music-services/music-service-core/types';

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

export const SpotifyItemTypes = {
  TRACK: 'track',
  EPISODE: 'episode',
};

export type SpotifyItem = Awaited<
  ReturnType<SpotifyApi['getMyCurrentPlayingTrack']>
>['body']['item'];

export type SpotifyCreateTokensProps = CreateMusicServiceTokensData &
  Awaited<ReturnType<SpotifyApi['authorizationCodeGrant']>>['body'];
