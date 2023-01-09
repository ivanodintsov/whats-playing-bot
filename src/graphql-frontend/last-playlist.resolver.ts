import { Args, Query, Resolver } from '@nestjs/graphql';
import { TrackEntityPagination } from './models/track-pagination.model';
import { CACHE_MANAGER, Inject, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { Link } from 'src/songs-info/models/link.model';
import { LinksService } from 'src/songs-info/links/links.service';

const limit = 10;

@Resolver(of => TrackEntityPagination)
export class LastPlaylistResolver {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly trackPlaylistService: TrackPlaylistService,
  ) {}

  @Query(returns => TrackEntityPagination)
  async getLastSongs(
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('page', { nullable: true }) page?: number,
  ) {
    if (page) {
      return this.getLastSongsPage(page);
    }

    return this.getLastSongsCursor(cursor);
  }

  private async getLastSongsCursor(cursor?: string) {
    const value = await this.cacheManager.get(`last10songs${cursor}`);

    if (value) {
      return value;
    }

    const data = await this.trackPlaylistService.getPaginatedTracks(
      limit,
      cursor,
    );

    const response = await this.createResponse(data);

    await this.cacheManager.set(`last10songs${cursor}`, response, { ttl: 10 });

    return response;
  }

  private async getLastSongsPage(page?: number) {
    const value = await this.cacheManager.get(`last10songsPage${page}`);

    if (value) {
      return value;
    }

    const data = await this.trackPlaylistService.getPaginatedTracksByPage(
      limit,
      page,
    );

    if (!data.data.length) {
      throw new NotFoundException();
    }

    const response = await this.createResponse(data);

    await this.cacheManager.set(`last10songsPage${page}`, response, {
      ttl: 10,
    });

    return response;
  }

  private async createResponse(rawData: {
    data: any[];
    nextItemCursor?: string;
  }) {
    const data = rawData.data?.map?.(item => item.toJSON());

    const meta = {
      cursor: undefined,
      previousCursor: undefined,
    };

    if (rawData.nextItemCursor) {
      meta.cursor = rawData.nextItemCursor;
    }

    const response = {
      data,
      meta,
    };

    return response;
  }
}

@Resolver(of => Link)
export class TrackResolver {
  constructor(private readonly linksService: LinksService) {}
}
