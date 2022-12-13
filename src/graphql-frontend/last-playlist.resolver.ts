import { Args, Query, Resolver } from '@nestjs/graphql';
import { ChatPlaylistPagination } from './models/chat-playlist-pagination.model';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as R from 'ramda';
import { CACHE_MANAGER, Inject, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { SongsService } from 'src/views/songs/songs.service';

const limit = 10;

@Resolver(of => ChatPlaylistPagination)
export class LastPlaylistResolver {
  constructor(
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly songWhip: SongWhipService,
    private readonly songsService: SongsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Query(returns => ChatPlaylistPagination)
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

    const {
      data: playlistList,
      nextItem,
    } = await this.spotifyPlaylist.getPaginatedTracks(limit, cursor);

    const response = await this.createResponse({
      playlistList,
      nextItem,
    });

    if (cursor) {
      response.meta.previousCursor = await this.spotifyPlaylist.getPreviousCursor(
        limit,
        cursor,
      );
    }

    await this.cacheManager.set(`last10songs${cursor}`, response, { ttl: 10 });

    return response;
  }
  private async getLastSongsPage(page?: number) {
    const value = await this.cacheManager.get(`last10songsPage${page}`);

    if (value) {
      return value;
    }

    const {
      data: playlistList,
      nextItem,
    } = await this.spotifyPlaylist.getPaginatedTracksByPage(limit, page);

    const response = await this.createResponse({
      playlistList,
      nextItem,
    });

    if (!response.data.length) {
      throw new NotFoundException();
    }

    response.meta.previousCursor = await this.spotifyPlaylist.getPreviousCursor(
      limit,
      playlistList[0]._id,
    );

    await this.cacheManager.set(`last10songsPage${page}`, response, {
      ttl: 10,
    });

    return response;
  }

  private async createResponse({ playlistList, nextItem }) {
    const playlist = [];
    const meta = {
      cursor: undefined,
      previousCursor: undefined,
    };

    const playlistUrls = playlistList.map(song => song.url);
    const playlistUris = playlistList.map(song => song.uri);
    const swList = await this.songWhip.getCachedSongs(playlistUrls);
    const songInfoList = await this.spotifyPlaylist.getSongInfo(playlistUris);

    const swDict = swList.reduce((acc, sw) => {
      const item = sw.toObject();

      item.links = R.pipe(
        R.toPairs,
        R.map(([key, item]) => {
          const headLink: any = R.head(item as any[]);

          if (key === 'itunes' || key === 'itunesStore') {
            const country = R.pipe(
              R.pathOr('', ['countries', 0]),
              R.toLower,
            )(headLink);
            headLink.link = headLink.link.replace('{country}', country);
          }

          headLink.link = this.songsService.createSongUrlFromData({
            id: sw._id,
            service: key,
            platform: 'frontend',
          });

          return {
            name: key,
            link: headLink.link,
          };
        }),
      )(item.links);

      acc[item.searchTrackUrl] = item;
      return acc;
    }, {});

    const songInfoDict = songInfoList.reduce((acc, sw) => {
      const item = sw.toObject();
      acc[item.uri] = item;
      return acc;
    }, {});

    playlistList.forEach(item => {
      const song = item.toObject();
      song.songWhip = swDict[song.url];
      song.info = songInfoDict[song.uri];
      playlist.push(song);
    });

    if (nextItem) {
      meta.cursor = nextItem._id;
    }

    const response = {
      data: playlist,
      meta,
    };

    return response;
  }
}
