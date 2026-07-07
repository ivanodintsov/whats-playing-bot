import { Injectable } from '@nestjs/common';
import * as spotifyUri from 'spotify-uri';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { ParserService } from '../parser/parser.service';
import { IArtist, ITrack, SpotifyURL } from '../types/parser';
import { SpotifyService } from 'src/music-services/spotify-service/spotify-service.service';

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
      const spotifyService = await this.spotifyService.connect({
        user,
      });
      const track = await spotifyService.getFullTrack({
        id: (url.url as spotifyUri.Track).id,
      });

      const albumId = track.album.id;

      const artists: IArtist[] = [];

      for (let i = 0; i < track.artists.length; i++) {
        const artist = track.artists[i];
        artists.push(await this.getArtist(artist.id));
      }

      const { album } = await this.getAlbum(albumId);

      return {
        ...track,
        artist: null,
        artists,
        album: {
          ...album,
          artists,
        },
      };
    }
  }

  public async updateSong(song: ITrack) {
    const search = `${song.name} ${song?.artists
      ?.map((artist) => artist.name)
      .join(' ')}`;

    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const spotifyResponse = await spotifyService.searchTracks({
      search,
      options: {
        pagination: {
          limit: 1,
        },
      },
    });

    const track = spotifyResponse.tracks?.[0];

    if (!track) {
      return song;
    }

    const fullTrack = await spotifyService.getFullTrack({
      id: track.id,
    });

    song.links = [...song.links, ...fullTrack.links];

    return song;
  }

  async getAlbum(id: string) {
    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const albumResponse = await spotifyService.getAlbum({
      id,
    });

    const artists: IArtist[] = [];

    for (let i = 0; i < albumResponse.artists.length; i++) {
      const artist = albumResponse.artists[i];
      artists.push(
        await spotifyService.getArtist({
          id: artist.id,
        }),
      );
    }

    const album = { ...albumResponse, artists };

    return {
      album,
      rawAlbum: album,
    };
  }

  private async getArtist(id: string) {
    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const artist = await spotifyService.getArtist({
      id,
    });

    return artist;
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
    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const albums = await spotifyService.getArtistAlbums({
      id: artistId,
      options: {
        pagination: {
          offset,
          limit: 20,
        },
      },
    });

    return {
      ids: albums.items.map((album) => album.id),
      hasMore: !!albums.pagination.next,
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
    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const tracks = await spotifyService.getAlbumTracks({
      id: artistId,
      options: {
        pagination: {
          offset: data?.offset ? data.offset + 20 : 0,
          limit: 20,
        },
      },
    });
    const tracksIds = tracks?.items?.map?.((track) => track.id) || [];

    if (!tracksIds?.length) {
      return {
        ids: [],
        hasMore: false,
      };
    }

    return {
      ids: tracksIds,
      hasMore: !!tracks.pagination.next,
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

    const spotifyService = await this.spotifyService.connect({
      user,
    });
    const response = await spotifyService.getFullTrack({
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
      rawTrack: response,
    };
  }
}
