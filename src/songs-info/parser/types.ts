import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { PooledToken } from '../tokens-pool/polled-token';
import {
  ITrack,
  MusicServiceProvider,
} from 'src/music-services/music-service-core/types';
import { ParserMusicServiceURL } from '../types/parser';
import { Maybe } from 'src/typings';

export type Provider = MusicServiceProvider;

export type ParserContext<T> = {
  tokens: PooledToken<MusicServiceToken>;
} & T;

export type ParseURLContext = ParserContext<{
  url: string;
}>;
export type ParseSongContext<
  T extends ParserMusicServiceURL = ParserMusicServiceURL,
> = ParserContext<{
  url: T;
}>;
export type UpdateSongContext = ParserContext<{ song: ITrack }>;
export type SearchSongFunctionContext = ParserContext<{
  song: ITrack;
  prevBestTrack: Maybe<ITrack>;
}>;
export type SearchSongFunctionReturnDataType = {
  success: boolean;
  track: Maybe<ITrack>;
};
export type SearchSongFunctionReturnType =
  Promise<SearchSongFunctionReturnDataType>;
export type GetAlbumContext = ParserContext<{ albumId: string }>;
export type GetAlbumTracksIdsContext = ParserContext<{
  albumId: string;
  data: {
    hasMore: boolean;
    offset: number;
    total: number;
    limit: number;
  } | null;
}>;
export type GetTrackContext = ParserContext<{ id: string }>;
export type SearchSongContext = ParserContext<
  Partial<{
    isrc: string[];
    searchText: string;
    normalizedData: {
      trackName: string;
      trackArtist?: string;
    };
  }>
>;
export type GetFinalSongFromSearchContext = ParserContext<
  Partial<{
    track: ITrack;
  }>
>;
export type GetArtistAlbumsIdsContext = ParserContext<{
  artistId: string;
  data: {
    hasMore: boolean;
    offset: number;
    total: number;
    limit: number;
  } | null;
}>;
