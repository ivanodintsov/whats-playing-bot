import { Injectable } from '@nestjs/common';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';
import { ParserService } from '../parser/parser.service';
import {
  SERVICES_PROVIDERS,
  WAIT_TIME_BETWEEN_PARSES,
} from '../parser/constants';
import {
  GetAlbumContext,
  GetAlbumTracksIdsContext,
  GetArtistAlbumsIdsContext,
  GetFinalSongFromSearchContext,
  GetTrackContext,
  ParserContext,
  ParseSongContext,
  ParseURLContext,
  Provider,
  SearchSongContext,
  SearchSongFunctionContext,
  SearchSongFunctionReturnType,
} from '../parser/types';
import { IArtist, ITrack } from 'src/music-services/music-service-core/types';
import { SpotifyService } from 'src/music-services/spotify-service/spotify-service.service';
import { Maybe } from 'src/typings';
import { sleep } from 'src/utils/sleep';
import { ParserMusicServiceURLType, ParserSpotifyURL } from '../types/parser';
import { SpotifyUriParser } from 'src/music-services/music-services-uri-parser/spotify-uri';
import { MusicServiceURIType } from 'src/music-services/music-services-uri-parser/types';

@Injectable()
export class SpotifyParserService extends ParserService {
  public musicServiceProvider = MUSIC_SERVICE_PROVIDERS.SPOTIFY;
  public providerName: Provider = SERVICES_PROVIDERS.spotify;
  protected readonly _type = MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY;

  constructor(private readonly spotifyService: SpotifyService) {
    super();
  }

  public async parseUrl({ url }: ParseURLContext): Promise<ParserSpotifyURL> {
    const uriParser = SpotifyUriParser.parseUri(url);

    if (uriParser.uri.uri.type === MusicServiceURIType.TRACK) {
      return {
        type: MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
        data: {
          id: uriParser.uri.uri.id,
          type: ParserMusicServiceURLType.TRACK,
          url: uriParser.createUrl(),
        },
      };
    }
  }

  public async parseSong({
    url,
    tokens,
  }: ParseSongContext<ParserSpotifyURL>): Promise<ITrack> {
    if (url.data.type === ParserMusicServiceURLType.TRACK) {
      const { service } = await this.spotifyService.connect({
        token: tokens,
      });
      const track = await service.getFullTrack({
        id: url.data.id,
      });

      const albumId = track.album.id;

      const artists: IArtist[] = [];

      for (let i = 0; i < track.artists.length; i++) {
        const artist = track.artists[i];
        artists.push(
          await this.getArtist({
            id: artist.id,
            tokens,
          }),
        );
      }

      const { album } = await this.getAlbum({
        albumId,
        tokens,
      });

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

  protected async getFinalSongFromSearch({
    tokens,
    track,
  }: GetFinalSongFromSearchContext): Promise<ITrack> {
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });

    const finalTrack = await service.getFullTrack({
      id: track.id,
    });

    return finalTrack;
  }

  protected async foundTrackAditional({
    song,
    tokens,
  }: SearchSongFunctionContext): SearchSongFunctionReturnType {
    return {
      success: false,
      track: null,
    };
  }

  protected async searchSongs({
    tokens,
    isrc,
    searchText,
  }: SearchSongContext): Promise<Maybe<ITrack[]>> {
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });

    if (!!isrc?.length) {
      const responses: ITrack[] = [];
      const searchList = isrc.map((isrc) => `isrc:${isrc}`);

      for (let i = 0; i < searchList.length; i++) {
        const search = searchList[i];

        const spotifyResponse = await service.searchTracks({
          search,
        });

        if (spotifyResponse?.tracks?.length) {
          responses.push(...spotifyResponse.tracks);
        }

        const hasNext = !!searchList[i + 1];

        if (hasNext) {
          await sleep(WAIT_TIME_BETWEEN_PARSES);
        }
      }

      return responses;
    }

    const spotifyResponse = await service.searchTracks({
      search: searchText,
    });

    return spotifyResponse.tracks;
  }

  async getAlbum({ albumId, tokens }: GetAlbumContext) {
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });
    const albumResponse = await service.getAlbum({
      id: albumId,
    });

    const artists: IArtist[] = [];

    for (let i = 0; i < albumResponse.artists.length; i++) {
      const artist = albumResponse.artists[i];
      artists.push(
        await service.getArtist({
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

  private async getArtist({ id, tokens }: ParserContext<{ id: string }>) {
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });
    const artist = await service.getArtist({
      id,
    });

    return artist;
  }

  async getArtistAlbumsIds({
    artistId,
    data,
    tokens,
  }: GetArtistAlbumsIdsContext) {
    const offset = (data?.offset ? data.offset : 0).toString();
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });
    const albums = await service.getArtistAlbums({
      id: artistId,
      options: {
        pagination: {
          offset,
          limit: '20',
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

  async getAlbumTracksIds({ albumId, data, tokens }: GetAlbumTracksIdsContext) {
    const { service } = await this.spotifyService.connect({
      token: tokens,
    });
    const tracks = await service.getAlbumTracks({
      id: albumId,
      options: {
        pagination: {
          offset: (data?.offset ? data.offset + 20 : 0).toString(),
          limit: '20',
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

  async getTrack({ id, tokens }: GetTrackContext) {
    if (!id) {
      return;
    }

    const { service } = await this.spotifyService.connect({
      token: tokens,
    });
    const response = await service.getFullTrack({
      id,
    });
    const parsedUri = await this.parseUrl({
      url: response.links[0].providerUrl,
      tokens,
    });

    return {
      track: await this.parseSong({
        tokens,
        url: parsedUri,
      }),
      rawTrack: response,
    };
  }
}
