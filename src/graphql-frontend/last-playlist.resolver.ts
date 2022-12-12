import {
  Args,
  Mutation,
  Query,
  Resolver,
  Subscription,
  Float,
} from '@nestjs/graphql';
import { ChatPlaylistPagination } from './models/chat-playlist-pagination.model';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as R from 'ramda';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { SongsService } from 'src/views/songs/songs.service';

@Resolver(of => ChatPlaylistPagination)
export class LastPlaylistResolver {
  constructor(
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly songWhip: SongWhipService,
    private readonly songsService: SongsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Query(returns => ChatPlaylistPagination)
  async getLastSongs(@Args('cursor', { nullable: true }) cursor?: string) {
    const value = await this.cacheManager.get(`last10songs${cursor}`);

    if (value) {
      return value;
    }

    const playlist = [];
    const limit = 10;
    const hasNextItem = 1;
    const meta = {
      cursor: undefined,
      previousCursor: undefined,
    };

    const playlistList = await this.spotifyPlaylist.getPaginatedTracks(
      limit + hasNextItem,
      cursor,
    );

    if (cursor) {
      meta.previousCursor = await this.spotifyPlaylist.getPreviousCursor(
        limit,
        cursor,
      );
    }

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

    for (let index = 0; index < playlistList.length - hasNextItem; index++) {
      const song = playlistList[index].toObject();
      song.songWhip = swDict[song.url];
      song.info = songInfoDict[song.uri];
      playlist.push(song);
    }

    if (playlistList[limit]) {
      meta.cursor = playlistList[limit]._id;
    }

    const response = {
      data: playlist,
      meta,
    };

    await this.cacheManager.set(`last10songs${cursor}`, response, { ttl: 10 });

    return response;
  }
}
