import { Args, Info, Query, Resolver } from '@nestjs/graphql';
import { fieldsMap } from 'graphql-fields-list';
import { TrackEntityPagination } from './models/track-pagination.model';
import { CACHE_MANAGER, Inject, NotFoundException } from '@nestjs/common';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { Link } from 'src/songs-info/models/link.model';
import { LinksService } from 'src/songs-info/links/links.service';
import { plainToClass } from 'class-transformer';
import { PlaylistEntityResponseDTO } from './dto/playlist.dto';
import { Cacheable } from './decorators/cache.decorator';
import { Cache } from 'cache-manager';

const limit = 10;

@Resolver(of => TrackEntityPagination)
export class LastPlaylistResolver {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly trackPlaylistService: TrackPlaylistService,
  ) {}

  @Query(returns => TrackEntityPagination)
  @Cacheable({ ttl: 60 })
  async getLastSongs(
    @Info() info: any,
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('page', { nullable: true }) page?: number,
  ) {
    const fields = fieldsMap(info, { skip: ['*__*'] });

    if (page) {
      return this.getLastSongsPage(page);
    }

    return this.getLastSongsCursor(cursor, fields?.data);
  }

  private async getLastSongsCursor(cursor?: string, fields?: any) {
    const data = await this.trackPlaylistService.getPaginatedTracks(
      limit,
      cursor,
      fields,
    );

    const response = await this.createResponse(data);

    return response;
  }

  private async getLastSongsPage(page?: number, fields?: any) {
    const data = await this.trackPlaylistService.getPaginatedTracksByPage(
      limit,
      page,
      fields,
    );

    if (!data.data.length) {
      throw new NotFoundException();
    }

    const response = await this.createResponse(data);

    return response;
  }

  private async createResponse(rawData: {
    data: any[];
    nextItemCursor?: string;
  }) {
    const data = rawData.data?.map?.(item => {
      const data = item.toJSON ? item.toJSON() : item;

      return plainToClass(PlaylistEntityResponseDTO, data);
    });

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
