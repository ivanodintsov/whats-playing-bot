import { ParserMusicServiceURL } from '../types/parser';
import { IAlbum, ITrack } from 'src/music-services/music-service-core/types';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import {
  NO_ALBUM,
  NO_ARTIST,
} from 'src/music-services/music-service-core/constants';
import { Maybe } from 'src/typings';
import { ParserTextNormalizer } from './parset-text-normalizer';
import { ParserMergeUtils } from './parser-merge-utils';
import {
  GetAlbumContext,
  GetAlbumTracksIdsContext,
  GetArtistAlbumsIdsContext,
  GetTrackContext,
  ParseSongContext,
  ParseURLContext,
  UpdateSongContext,
  Provider,
  SearchSongContext,
  SearchSongFunctionContext,
  SearchSongFunctionReturnType,
  GetFinalSongFromSearchContext,
  SearchSongFunctionReturnDataType,
} from './types';
import { ParsedTrackMatcher } from './parsed-tracks-matcher';
import { sleep } from 'src/utils/sleep';
import { SERVICES_PROVIDERS, WAIT_TIME_BETWEEN_PARSES } from './constants';

export type CheckFoundedTrackListMethodsNames =
  | 'searchTrackListByIsrc'
  | 'searchByTrackListMetadata'
  | 'searchTrackListByMormalizedTrackMetadata';

export abstract class ParserService {
  public abstract musicServiceProvider: MUSIC_SERVICE_PROVIDERS;
  public abstract providerName: Provider;
  public abstract parseUrl(
    ctx: ParseURLContext,
  ): Promise<ParserMusicServiceURL>;
  public abstract parseSong(ctx: ParseSongContext): Promise<ITrack>;
  protected abstract readonly _type: string;

  protected SEARCH_TRACKS_METHODS: CheckFoundedTrackListMethodsNames[] = [
    'searchTrackListByIsrc',
    'searchByTrackListMetadata',
    'searchTrackListByMormalizedTrackMetadata',
  ];

  get type() {
    return this._type;
  }

  protected abstract searchSongs({
    tokens,
    isrc,
    searchText,
  }: SearchSongContext): Promise<Maybe<ITrack[]>>;
  protected abstract getFinalSongFromSearch({
    tokens,
    track,
  }: GetFinalSongFromSearchContext): Promise<ITrack>;

  public async updateSong({
    song,
    tokens,
  }: UpdateSongContext): Promise<ITrack> {
    let track = song;
    let foundedMatch = await this.foundTrackAditional({
      song,
      tokens,
      prevBestTrack: null,
    });
    console.log(foundedMatch);

    if (!foundedMatch.success) {
      foundedMatch = await this.foundTrack({
        song,
        tokens,
        prevBestTrack: foundedMatch.track,
      });
    }

    console.log(foundedMatch);

    if (foundedMatch.success) {
      track = this._mergeTracks(
        track,
        foundedMatch.track,
        null,
        this.providerName,
      );
    }

    return track;
  }

  protected abstract foundTrackAditional({
    song,
    tokens,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType;

  private async foundTrack({
    song,
    tokens,
    prevBestTrack,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType {
    let foundedMatch: SearchSongFunctionReturnDataType | null;
    let prevNotMatchedFound: SearchSongFunctionReturnDataType | null = {
      success: false,
      track: prevBestTrack,
    };

    for (let i = 0; i < this.SEARCH_TRACKS_METHODS.length; i++) {
      const method = this.SEARCH_TRACKS_METHODS[i];
      const searchResponse = await this[method]({
        song,
        tokens,
        prevBestTrack: prevNotMatchedFound?.track,
      });

      prevNotMatchedFound = searchResponse;

      if (searchResponse.success) {
        const response = await this.getFinalSongFromSearch({
          track: searchResponse.track,
          tokens,
        });

        if (response) {
          const match: SearchSongFunctionReturnDataType = {
            success: true,
            track: response,
          };

          foundedMatch = match;
          break;
        }
      }

      const hasNext = !!this.SEARCH_TRACKS_METHODS[i + 1];

      if (hasNext) {
        await sleep(WAIT_TIME_BETWEEN_PARSES);
      }
    }

    if (!foundedMatch) {
      if (prevNotMatchedFound) {
        return prevNotMatchedFound;
      }

      return {
        success: false,
        track: null,
      };
    }

    return foundedMatch;
  }

  protected getBaseNormalizedData({ song }: Omit<UpdateSongContext, 'tokens'>) {
    const trackName = ParserTextNormalizer.normalizeString(song.name);
    const trackArtist = ParserTextNormalizer.normalizeString(
      song?.artists?.map((artist) => artist.name).join(' '),
    );
    const searchText = [trackName, trackArtist].filter(Boolean).join(' ');

    return {
      trackName,
      trackArtist,
      searchText,
    };
  }

  protected async searchTrackListByIsrc({
    song,
    tokens,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType {
    const normalizedData = this.getBaseNormalizedData({ song });
    const response = await this.searchSongs({
      tokens,
      searchText: normalizedData.searchText,
      isrc: song.isrc,
      normalizedData,
    });
    const match = ParsedTrackMatcher.checkFoundedTrackListByIsrc({
      track: song,
      foundedTrackList: response || [],
    });

    return {
      success: !!match,
      track: match,
    };
  }

  protected async searchTrackListByMormalizedTrackMetadata({
    song,
    tokens,
    prevBestTrack,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType {
    if (!prevBestTrack) {
      return {
        success: false,
        track: null,
      };
    }
    const normalizedPrevTrackData = ParsedTrackMatcher.normalizeTrackMetadata({
      track: song,
      foundedTrack: prevBestTrack,
    });

    const trackArtists =
      normalizedPrevTrackData.normalizedTrackData.trackArtists
        .filter(Boolean)
        .join(' ');
    const trackName = normalizedPrevTrackData.normalizedTrackData.trackName;
    const normalizedData = {
      trackName,
      trackArtists,
      searchText: [trackName, trackArtists].filter(Boolean).join(' '),
    };
    const response = await this.searchSongs({
      tokens,
      searchText: normalizedData.searchText,
      normalizedData,
    });
    const match = ParsedTrackMatcher.checkFoundedTrackListMetadata({
      track: song,
      foundedTrackList: response || [],
    });

    return {
      success: match.match.isMatched,
      track: match.track,
    };
  }

  protected async searchByTrackListMetadata({
    song,
    tokens,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType {
    const normalizedData = this.getBaseNormalizedData({ song });
    const response = await this.searchSongs({
      tokens,
      searchText: normalizedData.searchText,
      normalizedData,
    });
    const match = ParsedTrackMatcher.checkFoundedTrackListMetadata({
      track: song,
      foundedTrackList: response || [],
    });

    return {
      success: match.match.isMatched,
      track: match.track,
    };
  }

  async getArtistAlbumsIds(ctx: GetArtistAlbumsIdsContext): Promise<{
    ids: any[];
    hasMore?: boolean;
    data?: any;
  }> {
    return;
  }

  async getAlbum(ctx: GetAlbumContext): Promise<{
    album: IAlbum;
    rawAlbum: any;
  }> {
    return;
  }

  async getAlbumTracksIds(ctx: GetAlbumTracksIdsContext): Promise<{
    ids: any[];
    hasMore?: boolean;
    data?: any;
  }> {
    return;
  }

  public getTrack(ctx: GetTrackContext): Promise<{
    track: ITrack;
    rawTrack: any;
  }> {
    return;
  }

  protected _mergeTrackAlbums(
    track1: ITrack,
    track2: ITrack,
    track1Provider: Provider,
    track2Provider: Provider,
  ) {
    if (!track2.album) {
      return track1;
    }

    if (!track1.album) {
      track1.album = track2.album;
      return track1;
    }

    if (track1.album.id === NO_ALBUM && track2.album.id !== NO_ALBUM) {
      track1.album.id = track2.album.id;
    }

    if (track2.album.id !== NO_ALBUM) {
      const mergeFields = [
        'name',
        'totalTracks',
        'albumType',
        'releaseDate',
        'artists',
      ];

      mergeFields.forEach((field) => {
        track1.album[field] = ParserMergeUtils.selectPreferredProviderValue(
          track1.album[field],
          track2.album[field],
          track1Provider,
          track2Provider,
        );
      });

      track1.album.availableMarkets = ParserMergeUtils.mergeStringArrays(
        track1.album.availableMarkets,
        track2.album.availableMarkets,
      );
      track1.album.image = ParserMergeUtils.mergeImages(
        track1.album.image,
        track2.album.image,
        track1Provider,
        track2Provider,
      );
    }

    track1.album.links = ParserMergeUtils.mergeUniqueBy(
      [track1.album.links, track2.album.links],
      (item) => item.providerUrl,
    );
    track1.album.isrc = ParserMergeUtils.mergeStringArrays(
      track1.album.isrc,
      track2.album.isrc,
    );
    track1.album.upc = ParserMergeUtils.mergeStringArrays(
      track1.album.upc,
      track2.album.upc,
    );
    track1.album.ean = ParserMergeUtils.mergeStringArrays(
      track1.album.ean,
      track2.album.ean,
    );

    return track1;
  }

  protected _mergeTrackArtists(
    track1: ITrack,
    track2: ITrack,
    track1Provider: Provider,
    track2Provider: Provider,
  ) {
    if (!track2.artists.length) {
      return track1;
    }

    if (!track1.artists.length) {
      track1.artists = track2.artists;
      return track1;
    }

    for (let i = 0; i < track1.artists.length; i++) {
      const artist1 = track1.artists[i];
      const artist2Match = ParsedTrackMatcher.findArtistByName(
        artist1,
        track2.artists,
      );

      if (artist2Match) {
        const { item: artist2 } = artist2Match;
        if (artist1.id === NO_ARTIST) {
          if (artist2.id !== NO_ARTIST) {
            artist1.id = artist2.id;
          }

          const mergeFields = ['name', 'image'];

          mergeFields.forEach((field) => {
            artist1[field] = ParserMergeUtils.selectPreferredProviderValue(
              artist1[field],
              artist2[field],
              track1Provider,
              track2Provider,
            );
          });
        }

        artist1.links = ParserMergeUtils.mergeUniqueBy(
          [artist1.links, artist2.links],
          (item) => item.providerUrl,
        );
        artist1.genres = ParserMergeUtils.mergeUniqueBy(
          [artist1.genres, artist2.genres],
          (item) => item.slug,
        );
        artist1.socials = ParserMergeUtils.mergeUniqueBy(
          [artist1.socials, artist2.socials],
          (item) => item.url,
        );
      }
    }

    return track1;
  }

  protected _mergeTracks(
    track1: ITrack,
    track2: ITrack,
    track1Provider: Provider,
    track2Provider: Provider,
  ) {
    const mergeFields = ['name', 'type', 'trackNumber', 'explicit', 'duration'];

    mergeFields.forEach((field) => {
      track1[field] = ParserMergeUtils.selectPreferredProviderValue(
        track1[field],
        track2[field],
        track1Provider,
        track2Provider,
      );
    });

    track1 = this._mergeTrackAlbums(
      track1,
      track2,
      track1Provider,
      track2Provider,
    );
    track1 = this._mergeTrackArtists(
      track1,
      track2,
      track1Provider,
      track2Provider,
    );
    track1.links = ParserMergeUtils.mergeUniqueBy(
      [track1.links, track2.links],
      (item) => item.providerUrl,
    );

    return track1;
  }
}
