import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  BadRequestException,
  Inject,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { xxh3 } from '@node-rs/xxhash';
import { GqlAuthGuard } from './auth/auth.guard';
import { ContextResponse } from './auth/user';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SoundcloudService } from 'src/music-services/soundcloud-service/soundcloud-service.service';
import {
  GetStreamByURLArgs,
  SoundCloudStreamResponse,
} from './models/soundcloud/soundcloud.model';
import { TokensPoolService } from 'src/songs-info/tokens-pool/tokens-pool.service';
import { Logger } from 'src/logger.service';
import { Maybe } from 'src/typings';
import { SoundCloudTrackStream } from 'src/music-services/soundcloud-service/types';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { NoStreamAvailableException } from './models/errors/NoStreamAvailableException';
import {
  SoundCloudUriType,
  SoundCloudURNParser,
} from 'src/songs-info/soundcloud-parser/soundcloud-urn-parser';
import { DistributedSingleFlightService } from 'src/distributed-single-flight/distributed-single-flight.service';
import { Cacheable } from './cache.plugin';
import {
  SoundCloudArtistPlaylistsResponse,
  SoundCloudArtistResponse,
  SoundCloudGetArtistInput,
  SoundCloudGetArtistPlaylistsInput,
  SoundCloudGetPlaylistInput,
  SoundCloudGetPlaylistItemsInput,
  SoundCloudPagination,
  SoundCloudPlaylistItemsResponse,
  SoundCloudPlaylistResponse,
  SoundCloudSearchInput,
  SoundCloudSearchPlaylistsResponse,
  SoundCloudSearchTracksResponse,
  SoundCloudSearchUsersResponse,
} from './models/soundcloud/soundcloud-search.model';
import { isDefined } from 'src/utils/isDefined';
import { ThrottlerGqlAuth } from './throttler/guards/throttler-gql-auth';

interface PlaybackSource {
  type: 'hls' | 'mp3';
  quality?: 160 | 96 | 128;
  url: string;
}

@Resolver((of) => SoundCloudStreamResponse)
export class SoundCloudResolver {
  private readonly logger = new Logger(SoundCloudResolver.name);

  constructor(
    private readonly appConfig: ConfigService,
    private readonly soundCloudService: SoundcloudService,
    private readonly tokenPoolService: TokensPoolService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly singleFlightService: DistributedSingleFlightService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudSearchTracksResponse)
  async soundcloudSearchTracks(
    @ContextResponse() res: Response,
    @Args('soundCloudSearchInput')
    soundCloudSearchInput: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchTracksResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:search-track',
      key: this._createSearchKey(soundCloudSearchInput),
      timeout: 10000,
      owner: () => this._searchTrack(soundCloudSearchInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudSearchPlaylistsResponse)
  async soundcloudSearchPlaylists(
    @ContextResponse() res: Response,
    @Args('soundCloudSearchInput')
    soundCloudSearchInput: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchPlaylistsResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:search-playlists',
      key: this._createSearchKey(soundCloudSearchInput),
      timeout: 10000,
      owner: () => this._searchPlaylists(soundCloudSearchInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudSearchUsersResponse)
  async soundcloudSearchUsers(
    @ContextResponse() res: Response,
    @Args('soundCloudSearchInput')
    soundCloudSearchInput: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchUsersResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:search-users',
      key: this._createSearchKey(soundCloudSearchInput),
      timeout: 10000,
      owner: () => this._searchUsers(soundCloudSearchInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudPlaylistResponse)
  async soundcloudGetPlaylist(
    @ContextResponse() res: Response,
    @Args('playlistInput')
    playlistInput: SoundCloudGetPlaylistInput,
  ): Promise<SoundCloudPlaylistResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:get-playlist',
      key: playlistInput.playlistId,
      timeout: 10000,
      owner: () => this._getPlaylist(playlistInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudPlaylistItemsResponse)
  async soundcloudGetPlaylistItems(
    @ContextResponse() res: Response,
    @Args('playlistInput')
    playlistInput: SoundCloudGetPlaylistItemsInput,
  ): Promise<SoundCloudPlaylistItemsResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:get-playlist-items',
      key: this._createPaginatedKey(
        [playlistInput.playlistId],
        playlistInput.pagination,
      ),
      timeout: 10000,
      owner: () => this._getPlaylistItems(playlistInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudArtistResponse)
  async soundcloudGetArtist(
    @ContextResponse() res: Response,
    @Args('artistInput')
    artistInput: SoundCloudGetArtistInput,
  ): Promise<SoundCloudArtistResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:get-artist',
      key: artistInput.artistId,
      timeout: 10000,
      owner: () => this._getArtist(artistInput),
      waiter: (res) => res,
    });
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(15)
  @Query((returns) => SoundCloudArtistPlaylistsResponse)
  async soundcloudGetArtistPlaylists(
    @ContextResponse() res: Response,
    @Args('artistInput')
    artistInput: SoundCloudGetArtistPlaylistsInput,
  ): Promise<SoundCloudArtistPlaylistsResponse> {
    return this.singleFlightService.execute({
      channel: 'sc:get-artist-playlists',
      key: this._createPaginatedKey(
        [artistInput.artistId],
        artistInput.pagination,
      ),
      timeout: 10000,
      owner: () => this._getArtistPlaylists(artistInput),
      waiter: (res) => res,
    });
  }

  private _getArtist = async (
    input: SoundCloudGetArtistInput,
  ): Promise<SoundCloudArtistResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.getArtistRaw({
        artistId: input.artistId,
      });

      return {
        raw: response,
      };
    });
  };

  private _getArtistPlaylists = async (
    input: SoundCloudGetArtistPlaylistsInput,
  ): Promise<SoundCloudArtistPlaylistsResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.getArtistPlaylistsRaw({
        artistId: input.artistId,
        options: {
          pagination: {
            offset: input.pagination?.offset?.toString(),
            limit: '4',
            next: input.pagination?.next,
          },
        },
      });

      return {
        raw: response,
      };
    });
  };

  private _createSearchKey(soundCloudSearchInput: SoundCloudSearchInput) {
    return this._createPaginatedKey(
      [soundCloudSearchInput.search],
      soundCloudSearchInput.pagination,
    );
  }

  private _createPaginatedKey(
    keys: string[],
    pagination: Maybe<SoundCloudPagination>,
  ) {
    return [
      ...keys,
      ...Object.keys(pagination || {})
        .sort()
        .map((key) => pagination[key]),
    ]
      .filter(isDefined)
      .join('-');
  }

  @UseGuards(GqlAuthGuard)
  @ThrottlerGqlAuth(10)
  // @Query((returns) => SoundCloudStreamResponse)
  async soundCloudResolveStream(
    @ContextResponse() res: Response,
    @Args() args: GetStreamByURLArgs,
  ) {
    const normalizedUrl = SoundCloudURNParser.parse(args.url);

    if (!normalizedUrl || normalizedUrl.kind === SoundCloudUriType.URN) {
      throw new BadRequestException();
    }

    try {
      const urlHash = xxh3.xxh64(`${normalizedUrl.url}`).toString(16);
      const queryKey = `sc:res-stream:${urlHash}`;
      const cachedStream =
        await this.cacheManager.get<SoundCloudStreamResponse>(queryKey);

      if (cachedStream) {
        if (
          !args.failedVersion ||
          args.failedVersion !== cachedStream.version
        ) {
          return cachedStream;
        }
      }

      const response = await this._resolveStream({
        url: normalizedUrl.url,
        key: queryKey,
      });

      return response;
    } catch (error) {
      this.logger.debug(error);
      throw new NotFoundException();
    }
  }

  @UseGuards(GqlAuthGuard)
  @Cacheable({ ttl: 60000 })
  // @Query((returns) => TrackEntity)
  async resolveSoundCloudUrl(
    @ContextResponse() res: Response,
    @Args() args: GetStreamByURLArgs,
  ) {
    const normalizedUrl = SoundCloudURNParser.parse(args.url);

    if (!normalizedUrl || normalizedUrl.kind === SoundCloudUriType.URN) {
      throw new BadRequestException();
    }

    try {
      const soundcloudTokens =
        await this.soundCloudService.findOrcreateServiceTokens();
      const token =
        await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
      const connected = await this.soundCloudService.connect({ token });

      const response = await connected.using(async (service) => {
        const track = await service.resolveUrlWithInternalType({
          url: normalizedUrl.url,
        });

        if (!track) {
          throw new NotFoundException();
        }

        return track;
      });

      return response;
    } catch (error) {
      this.logger.debug(error);
      throw new NotFoundException();
    }
  }

  private _searchTrack = async (
    input: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchTracksResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.searchTracksRaw({
        search: input.search,
        options: {
          pagination: {
            offset: input.pagination?.offset?.toString(),
            limit: '20',
            next: input.pagination?.next,
          },
        },
      });

      return {
        raw: response,
      };
    });
  };

  private _searchPlaylists = async (
    input: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchPlaylistsResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.searchPlaylists({
        search: input.search,
        options: {
          pagination: {
            offset: input.pagination?.offset?.toString(),
            limit: '20',
            next: input.pagination?.next,
          },
        },
      });

      return {
        raw: response,
      };
    });
  };

  private _searchUsers = async (
    input: SoundCloudSearchInput,
  ): Promise<SoundCloudSearchUsersResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.searchUsers({
        search: input.search,
        options: {
          pagination: {
            offset: input.pagination?.offset?.toString(),
            limit: '20',
            next: input.pagination?.next,
          },
        },
      });

      return {
        raw: response,
      };
    });
  };

  private _getPlaylist = async (
    input: SoundCloudGetPlaylistInput,
  ): Promise<SoundCloudPlaylistResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.getPLaylistRaw({
        playlistId: input.playlistId,
      });

      return {
        raw: response,
      };
    });
  };

  private _getPlaylistItems = async (
    input: SoundCloudGetPlaylistItemsInput,
  ): Promise<SoundCloudPlaylistItemsResponse> => {
    const soundcloudTokens =
      await this.soundCloudService.findOrcreateServiceTokens();
    const token =
      await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
    const connected = await this.soundCloudService.connect({ token });

    return connected.using(async (service) => {
      const response = await service.getPLaylistItemsRaw({
        playlistId: input.playlistId,
        options: {
          pagination: {
            offset: input.pagination?.offset?.toString(),
            limit: '20',
            next: input.pagination?.next,
          },
        },
      });

      return {
        raw: response,
      };
    });
  };

  private async _resolveStream({ url, key }: { url: string; key: string }) {
    return this.singleFlightService.execute({
      channel: 'sc:res-stream',
      key,
      timeout: 10000,
      owner: async () => {
        const soundcloudTokens =
          await this.soundCloudService.findOrcreateServiceTokens();
        const token =
          await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
        const connected = await this.soundCloudService.connect({ token });

        return connected.using(async (service) => {
          const track = await service.resolveUrl({ url });
          const stream = await service.getTrackStream({ id: track.urn });
          const source = this._getPlaybackTypeFromStream(stream);

          if (!track.streamable) {
            throw new NoStreamAvailableException();
          }

          let access: Maybe<'playable' | 'preview'> = null;

          switch (track.access) {
            case 'playable':
            case 'preview':
              access = track.access;
              break;

            default:
              throw new NoStreamAvailableException();
          }

          if (!source) {
            throw new NotFoundException();
          }

          const streamURL = await service.resolveStreamUrl({
            url: source.url,
          });

          const response: SoundCloudStreamResponse = {
            type: source.type,
            access,
            quality: source.quality,
            url: streamURL.url,
            expiresAt: streamURL.expires?.date || null,
            version: xxh3.xxh64(streamURL.url).toString(16),
          };

          if (streamURL.expires) {
            try {
              await this.cacheManager.set(
                key,
                response,
                streamURL.expires.ttl * 1000,
              );
            } catch (error) {
              this.logger.debug(error);
            }
          }

          return response;
        });
      },
      waiter: (res) => res,
    });
  }

  private _getPlaybackTypeFromStream(stream: SoundCloudTrackStream) {
    let source: Maybe<PlaybackSource> = null;
    if (stream.hls_aac_160_url) {
      source = {
        type: 'hls',
        quality: 160,
        url: stream.hls_aac_160_url,
      };
    } else if (stream.hls_aac_96_url) {
      source = {
        type: 'hls',
        quality: 96,
        url: stream.hls_aac_96_url,
      };
    } else if (stream.preview_mp3_128_url) {
      source = {
        type: 'mp3',
        quality: 128,
        url: stream.preview_mp3_128_url,
      };
    }

    return source;
  }
}
