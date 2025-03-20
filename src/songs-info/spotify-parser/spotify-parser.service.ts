import { Injectable } from '@nestjs/common';
import { parse } from 'date-fns';
import * as spotifyUri from 'spotify-uri';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as SpotifyApi from 'spotify-web-api-node';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
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

const user = {
  userId: '7ea04c38-128f-48da-a066-ee6b5488f9c3',
  provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
};

@Injectable()
export class SpotifyParserService extends ParserService {
  protected readonly _type = 'spotify';

  constructor(private readonly spotifyService: SpotifyService) {
    super();
  }

  public normalizeUrl(url: string): string | undefined {
    const parsed = spotifyUri.parse(url);

    if (parsed.type === 'track') {
      const parsedUrl = parsed as spotifyUri.Track;
      return spotifyUri.formatOpenURL(parsedUrl);
    }
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

      const { album } = await this.getAlbum(albumId);
      const song = await this.createSong(track);

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

    const response = await this.spotifyService.getFullTrack({
      user,
      id: track.id,
    });
    const spotifySong = await this.createSong(response.track);

    song.links = [...song.links, ...spotifySong.links];

    return song;
  }

  private createSong(track: SpotifyApi.TrackObjectFull): ITrackSimple {
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

  async getAlbum(id: string) {
    const { album } = await this.spotifyService.getAlbum({
      user,
      id,
    });

    return {
      album: await this.createAlbum(album),
      rawAlbum: album,
    };
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

    const images = album.images?.sort?.(
      (img1, img2) => img2.width - img1.width,
    );

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
      image: images.length
        ? {
            height: images[0].height,
            width: images[0].width,
            url: images[0].url,
            medium: images[1] && {
              height: images[1].height,
              width: images[1].width,
              url: images[1].url,
            },
            small: images[2] && {
              height: images[2].height,
              width: images[2].width,
              url: images[2].url,
            },
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
    const images = artist.images?.sort?.(
      (img1, img2) => img2.width - img1.width,
    );

    return {
      genres: this.getGenres(artist.genres),
      name: artist.name,
      image: images.length
        ? {
            height: images[0].height,
            width: images[0].width,
            url: images[0].url,
            medium: images[1] && {
              height: images[1].height,
              width: images[1].width,
              url: images[1].url,
            },
            small: images[2] && {
              height: images[2].height,
              width: images[2].width,
              url: images[2].url,
            },
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

  async getArtistAlbumsIds(
    artistId: string,
    data: {
      hasMore: boolean;
      offset: number;
      total: number;
      limit: number;
    } | null,
  ) {
    const offset = data?.offset ? data.offset : 0;
    const { albums } = await this.spotifyService.getArtistAlbums({
      user,
      id: artistId,
      options: {
        pagination: {
          offset,
          limit: 20,
        },
      },
    });

    return {
      ids: albums.items.map(album => album.id),
      hasMore: !!albums.next,
      data: {
        ...albums,
        offset: offset + 20,
        items: null,
      },
    };
  }

  async getAlbumTracksIds(
    artistId: string,
    data: {
      hasMore: boolean;
      offset: number;
      total: number;
      limit: number;
    } | null,
  ) {
    const { tracks } = await this.spotifyService.getAlbumTracks({
      user,
      id: artistId,
      options: {
        pagination: {
          offset: data?.offset ? data.offset + 20 : 0,
          limit: 20,
        },
      },
    });
    const tracksIds = tracks?.items?.map?.(track => track.id) || [];

    if (!tracksIds?.length) {
      return {
        ids: [],
        hasMore: false,
      };
    }

    return {
      ids: tracksIds,
      hasMore: !!tracks.next,
      data: {
        ...tracks,
        items: null,
      },
    };
  }

  async getTrack(trackId: string) {
    if (!trackId) {
      return;
    }

    const response = await this.spotifyService.getFullTrack({
      user,
      id: trackId,
    });

    return {
      track: await this.parseSong({
        type: 'spotify',
        url: {
          id: trackId,
          type: 'track',
        },
      }),
      rawTrack: response.track,
    };
  }
}
