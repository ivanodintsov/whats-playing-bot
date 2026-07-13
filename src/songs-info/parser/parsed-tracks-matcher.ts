import { IArtist, ITrack } from 'src/music-services/music-service-core/types';
import {
  ArtistMatchResult,
  ParserTextNormalizer,
} from './parset-text-normalizer';
import { ParsingRating } from './parsing-rating';
import { NO_ALBUM } from 'src/music-services/music-service-core/constants';
import { Maybe } from 'src/typings';

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
  }) {
    let latestBestMatch: ReturnType<
      typeof ParsedTrackMatcher.checkFoundedTrackMetadata
    > | null = null;
    let latestBestMatchTrack: ITrack | null = null;

    const matchFounded = foundedTrackList.find((foundedTrack) => {
      const match = ParsedTrackMatcher.checkFoundedTrackMetadata({
        track,
        foundedTrack,
      });

      if (!latestBestMatch || match.totalScore >= latestBestMatch.totalScore) {
        latestBestMatch = match;
        latestBestMatchTrack = foundedTrack;
      }

      return match.isMatched;
    });

    return {
      match: latestBestMatch,
      track: matchFounded,
    };
  }

  static checkFoundedTrackMetadata({
    track,
    foundedTrack,
  }: {
    track: ITrack;
    foundedTrack: ITrack;
  }) {
    const threshold = 0.9;
    const parsingRating = new ParsingRating({ threshold });

    const { trackNameMatch, normalizedTrackData } =
      ParsedTrackMatcher.normalizeTrackMetadata({
        track,
        foundedTrack,
      });

    const trackNameWithoutArtistsMatch = ParserTextNormalizer.matchStrings(
      normalizedTrackData.trackName,
      foundedTrack.name,
      threshold,
    );

    parsingRating.addTrackNameScores(
      Math.max(trackNameMatch.score, trackNameWithoutArtistsMatch.score),
    );

    if (track.album.name !== NO_ALBUM) {
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
      totalScore: parsingRatingScores.totalScore,
      isMatched: parsingRatingScores.isMatched,
      normalizedTrackData,
    };
  }

  static normalizeTrackMetadata({
    track,
    foundedTrack,
  }: {
    track: ITrack;
    foundedTrack: ITrack;
  }) {
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
      trackNameMatch,
      normalizedTrackData: {
        trackName: trackNameWithoutArtists,
        trackArtists: normalizedSongArtistNames,
      },
    };
  }

  static findArtistByName(
    artist: IArtist,
    artists: IArtist[],
    threshold = 0.9,
  ): Maybe<{
    item: IArtist;
    match: ArtistMatchResult;
  }> {
    const matches: [number, ArtistMatchResult][] = [];

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

      matches.push([i, match]);
    }

    const highScore = matches.sort(
      ([_, match1], [__, match2]) => match2.score - match1.score,
    )[0];

    if (highScore && highScore[1].score >= threshold) {
      return {
        item: artists[highScore[0]],
        match: highScore[1],
      };
    }

    return null;
  }
}
