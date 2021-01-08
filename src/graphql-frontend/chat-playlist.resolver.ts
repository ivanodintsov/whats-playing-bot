import { Args, Mutation, Query, Resolver, Subscription, Float } from '@nestjs/graphql';
import { PubSub } from 'apollo-server-express';
import { ChatPlaylist } from './models/chat-playlist.model';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as R from 'ramda';

@Resolver(of => ChatPlaylist)
export class ChatPlaylistResolver {
  constructor(
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly songWhip: SongWhipService,
  ) {}

  @Query(returns => [ChatPlaylist])
  async chatPlaylists(@Args('chatId', { type: () => Float }) chatId: number) {
    const playlist = [];

    const playlistList = await this.spotifyPlaylist.getLastChatTracks(chatId, 10);
    const playlistUrls = playlistList.map(song => song.url);
    const swList = await this.songWhip.getCachedSongs(playlistUrls);

    const swDict = swList.reduce((acc, sw) => {
      const item = sw.toObject();

      item.links = R.pipe(
        R.toPairs,
        R.map(([key, item]) => {
          let headLink: any = R.head(item as any[]);

          if (key === 'itunes' || key === 'itunesStore') {
            const country = R.pipe(
              R.pathOr('', ['countries', 0]),
              R.toLower,
            )(headLink);
            headLink.link = headLink.link.replace('{country}', country);
          }

          return {
            name: key,
            link: headLink.link,
          };
        })
      )(item.links);

      acc[item.searchTrackUrl] = item;
      return acc;
    }, {});

    for (let index = 0; index < playlistList.length; index++) {
      const song = playlistList[index].toObject();
      song.songWhip = swDict[song.url];
      playlist.push(song);
    }

    return playlist;
  }
}
