import { IArtist, ITrack } from 'src/music-services/music-service-core/types';
import {
  MatchStringsResult,
  ParserTextNormalizer,
} from './parset-text-normalizer';
import { ParsingRating } from './parsing-rating';
import { NO_ALBUM } from 'src/music-services/music-service-core/constants';
import { Maybe } from 'src/typings';

type FoundMatchReturn = {
  match: Maybe<{
    score: number;
    isMatched: boolean;
    normalizedTrackData: {
      trackName: string;
      trackArtists: string[];
    };
  }>;
  track: Maybe<ITrack>;
};

export class ParsedTrackMatcher {
  static checkFoundedTrackByIsrc({
    track,
    foundedTrack,
  }: {
    track: ITrack;
    foundedTrack: ITrack;
  }) {
    return foundedTrack.isrc?.some((isrc) => track.isrc?.includes?.(isrc));
  }

  static checkFoundedTrackListByIsrc({
    track,
    foundedTrackList,
  }: {
    track: ITrack;
    foundedTrackList: ITrack[];
  }) {
    return foundedTrackList.find((foundedTrack) =>
      ParsedTrackMatcher.checkFoundedTrackByIsrc({
        track,
        foundedTrack,
      }),
    );
  }

  static checkFoundedTrackListMetadata({
    track,
    foundedTrackList,
  }: {
    track: ITrack;
    foundedTrackList: ITrack[];
  }): FoundMatchReturn {
    let latestBestMatch: ReturnType<
      typeof ParsedTrackMatcher.checkFoundedTrackMetadata
    > | null = null;

    for (let i = 0; i < foundedTrackList.length; i++) {
      const foundedTrack = foundedTrackList[i];

      const foundedTrackResult = ParsedTrackMatcher.checkFoundedTrackMetadata({
        track,
        foundedTrack,
      });

      if (
        !latestBestMatch ||
        foundedTrackResult.match.score >= latestBestMatch.match.score
      ) {
        latestBestMatch = foundedTrackResult;
      }

      if (foundedTrackResult.match.score === 1) {
        break;
      }
    }

    return latestBestMatch;
  }

  static checkFoundedTrackMetadata({
    track,
    foundedTrack,
  }: {
    track: ITrack;
    foundedTrack: ITrack;
  }): FoundMatchReturn {
    const threshold = 0.9;
    const parsingRating = new ParsingRating({ threshold });

    const { match } = ParsedTrackMatcher.normalizeTrackMetadata({
      track,
      foundedTrack,
    });

    const trackNameWithoutArtistsMatch = ParserTextNormalizer.matchStrings(
      match.normalizedTrackData.trackName,
      foundedTrack.name,
      threshold,
    );

    parsingRating.addTrackNameScores(
      Math.max(match.score, trackNameWithoutArtistsMatch.score),
    );

    if (track.album.name !== NO_ALBUM && foundedTrack.album.name !== NO_ALBUM) {
      const albumNameMatch = ParserTextNormalizer.matchStrings(
        track.album.name,
        foundedTrack.album.name,
        threshold,
      );
      parsingRating.addAlbumScores(albumNameMatch.score);
    }

    for (let i = 0; i < track.artists?.length; i++) {
      const artist1 = track.artists[i];
      const artist2Match = this.findArtistByName(
        artist1,
        foundedTrack.artists,
        threshold,
      );

      if (artist2Match) {
        const { match } = artist2Match;
        parsingRating.addArtistScores(foundedTrack.artists.length, match.score);
      }
    }

    if (
      !!track.duration &&
      !!foundedTrack.duration &&
      Math.abs(track.duration - foundedTrack.duration) <= 3000
    ) {
      parsingRating.addDurationScores();
    }

    const parsingRatingScores = parsingRating.getScores();

    return {
      match: {
        score: parsingRatingScores.totalScore,
        isMatched: parsingRatingScores.isMatched,
        normalizedTrackData: match.normalizedTrackData,
      },
      track: foundedTrack,
    };
  }

  static normalizeTrackMetadata({
    track,
    foundedTrack,
  }: {
    track: ITrack;
    foundedTrack: ITrack;
  }): FoundMatchReturn {
    const threshold = 0.9;
    const songNameNormalized = ParserTextNormalizer.normalizeString(track.name);
    const normalizedArtistNames =
      foundedTrack.artists?.map?.((artist) => {
        return ParserTextNormalizer.normalizeString(artist.name);
      }) || [];
    const trackNameMatch = ParserTextNormalizer.matchStrings(
      track.name,
      foundedTrack.name,
      threshold,
    );

    let trackNameWithoutArtists = ParserTextNormalizer.normalizeTrackNameString(
      trackNameMatch.normalizedA,
    );

    for (let i = 0; i < normalizedArtistNames.length; i++) {
      const artistName = normalizedArtistNames[i];
      if (songNameNormalized.includes(artistName)) {
        trackNameWithoutArtists = trackNameWithoutArtists.replaceAll(
          artistName,
          '',
        );
      }
    }
    const normalizedSongArtistNames: string[] = [];

    for (let i = 0; i < track.artists?.length; i++) {
      const artist1 = track.artists[i];

      normalizedSongArtistNames.push(
        ParserTextNormalizer.normalizeString(artist1.name),
      );
    }

    return {
      track: foundedTrack,
      match: {
        score: trackNameMatch.score,
        isMatched: trackNameMatch.score >= threshold,
        normalizedTrackData: {
          trackName: trackNameWithoutArtists,
          trackArtists: normalizedSongArtistNames,
        },
      },
    };
  }

  static findArtistByName(
    artist: IArtist,
    artists: IArtist[],
    threshold = 0.9,
  ): Maybe<{
    item: IArtist;
    match: MatchStringsResult;
  }> {
    let bestMatch: [number, MatchStringsResult] | null = null;

    for (let i = 0; i < artists.length; i++) {
      const compareArtist = artists[i];

      const match = ParserTextNormalizer.matchStrings(
        artist.name,
        compareArtist.name,
        threshold,
      );

      if (match.score === 1) {
        return {
          item: compareArtist,
          match,
        };
      }

      if (
        match.score >= threshold &&
        (!bestMatch || match.score > bestMatch[1].score)
      ) {
        bestMatch = [i, match];
      }
    }

    if (bestMatch) {
      return {
        item: artists[bestMatch[0]],
        match: bestMatch[1],
      };
    }

    return null;
  }
}
