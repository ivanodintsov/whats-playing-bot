import { Injectable } from '@nestjs/common';
import { parse } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import * as spotifyUri from 'spotify-uri';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { SpotifyService } from 'src/spotify/spotify.service';
import { ParserService } from '../parser/parser.service';
import {
  ALBUM_TYPE,
  IAlbum,
  IArtist,
  IGenre,
  ITrack,
  ITrackSimple,
  RELEASE_DATE_PRECISION,
  SONG_TYPE,
  SpotifyURL,
} from '../types/parser';

const user = { tg_id: 353381106 };

@Injectable()
export class SpotifyParserService extends ParserService {
  protected readonly _type = 'spotify';

  constructor(private readonly spotifyService: SpotifyService) {
    super();
  }

  public parseUrl(url: string): SpotifyURL {
    const parsed = spotifyUri.parse(url);

    if (parsed.type === 'track') {
      const parsedUrl = parsed as spotifyUri.Track;

      return {
        type: 'spotify',
        url: {
          id: parsedUrl.id,
          type: parsedUrl.type,
        },
      };
    }
  }

  public async parseSong(url: SpotifyURL): Promise<ITrack> {
    if (url.url.type === 'track') {
      const response = await this.spotifyService.getFullTrack({
        user,
        id: (url.url as spotifyUri.Track).id,
      });

      const { track } = response;
      const albumId = response.response.body.album.id;

      const artists: IArtist[] = [];

      for (let i = 0; i < track.artists.length; i++) {
        const artist = track.artists[i];
        artists.push(await this.getArtist(artist.id));
      }

      const album = await this.getAlbum(albumId);
      const song = await this.getSong(url, track);

      return {
        ...song,
        artists,
        album,
      };
    }
  }

  public async updateSong(song: ITrack) {
    const search = `${song.name} ${song?.artists
      ?.map(artist => artist.name)
      .join(' ')}`;

    const spotifyResponse = await this.spotifyService.searchTracks({
      user,
      search,
      options: {
        pagination: {
          limit: 1,
        },
      },
    });

    const track = spotifyResponse.response.body.tracks?.items?.[0];

    if (!track) {
      return song;
    }

    const spotifySong = await this.getSong({
      type: 'spotify',
      url: {
        id: track.id,
        type: 'track',
      },
    });

    song.links = [...song.links, ...spotifySong.links];

    return song;
  }

  private async getSong(
    url: SpotifyURL,
    song?: SpotifyApi.TrackObjectFull,
  ): Promise<ITrackSimple> {
    let track = song;

    if (!track) {
      const response = await this.spotifyService.getFullTrack({
        user,
        id: (url.url as spotifyUri.Track).id,
      });

      track = response.track;
    }

    return {
      name: track.name,
      type: SONG_TYPE.track,
      trackNumber: track.track_number,
      links: [
        {
          providerUrl: track.external_urls.spotify,
          provider: 'spotify',
          providerId: track.id,
        },
      ],
      isrc: track.external_ids.isrc && [track.external_ids.isrc],
      upc: track.external_ids.upc && [track.external_ids.upc],
      ean: track.external_ids.ean && [track.external_ids.ean],
      duration: track.duration_ms,
      explicit: track.explicit,
    };
  }

  private async getAlbum(id: string) {
    const { album } = await this.spotifyService.getAlbum({
      user,
      id,
    });

    return this.createAlbum(album);
  }

  private async createAlbum(
    album: SpotifyApi.AlbumObjectFull,
  ): Promise<IAlbum> {
    const artists: IArtist[] = [];

    for (let i = 0; i < album.artists.length; i++) {
      const artist = album.artists[i];
      artists.push(await this.getArtist(artist.id));
    }

    let releaseDate: Date;

    try {
      switch (album.release_date_precision) {
        case RELEASE_DATE_PRECISION.year:
          releaseDate = parse(album.release_date, 'yyyy', new Date());
          break;

        case RELEASE_DATE_PRECISION.month:
          releaseDate = parse(album.release_date, 'yyyy-MM', new Date());
          break;

        case RELEASE_DATE_PRECISION.day:
          releaseDate = parse(album.release_date, 'yyyy-MM-dd', new Date());
          break;

        default:
          break;
      }

      // if (releaseDate) {
      //   releaseDate = new Date(
      //     releaseDate.valueOf() + releaseDate.getTimezoneOffset() * 60 * 1000,
      //   );
      // }
    } catch (error) {}

    return {
      albumType: ALBUM_TYPE[album.album_type],
      availableMarkets: album.available_markets,
      totalTracks: album.total_tracks,
      artists,
      isrc: album.external_ids.isrc && [album.external_ids.isrc],
      upc: album.external_ids.upc && [album.external_ids.upc],
      ean: album.external_ids.ean && [album.external_ids.ean],
      links: [
        {
          providerUrl: album.external_urls.spotify,
          provider: 'spotify',
          providerId: album.id,
        },
      ],
      image: album.images.length
        ? {
            height: album.images[0].height,
            width: album.images[0].width,
            url: album.images[0].url,
          }
        : null,
      name: album.name,
      releaseDate,
    };
  }

  private async getArtist(id: string) {
    const { artist } = await this.spotifyService.getArtist({
      user,
      id,
    });

    return this.createArtist(artist);
  }

  private getGenres(genres: string[]): IGenre[] {
    return (
      genres?.map?.(genre => ({
        slug: genre,
      })) || []
    );
  }

  private createArtist(artist: SpotifyApi.ArtistObjectFull): IArtist {
    return {
      genres: this.getGenres(artist.genres),
      name: artist.name,
      image: artist.images.length
        ? {
            height: artist.images[0].height,
            width: artist.images[0].width,
            url: artist.images[0].url,
          }
        : null,
      links: [
        {
          providerUrl: artist.external_urls.spotify,
          providerId: artist.id,
          provider: 'spotify',
        },
      ],
    };
  }
}
