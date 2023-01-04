import { Args, Query, Resolver, Float } from '@nestjs/graphql';
import { Song } from './models/song.model';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import * as R from 'ramda';
import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';
import { SongsService } from 'src/views/songs/songs.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';

export type SongIdData = {
  id: string;
  service: string;
  platform: string;
};

@Resolver(of => Song)
export class SongResolver {
  constructor(
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly songsInfoService: SongsInfoService,
    private readonly songsLyrics: SongsLyricsService,
    private readonly songsService: SongsService,
  ) {}

  @Query(returns => Song)
  async song(@Args('songId', { type: () => String }) songId: string) {
    const data = this.parseSongId(songId);
    const item = await this.songsInfoService.getTrackById(data.id);

    const links = item.links.map(linkItem => {
      let link: string = linkItem.providerUrl;

      if (
        linkItem.provider === 'itunes' ||
        linkItem.provider === 'itunesStore'
      ) {
        const country = 'US';
        link = link.replace('{country}', country);
      }

      link = this.songsService.createSongUrlFromData({
        id: item.oldId || item.id,
        service: linkItem.provider,
        platform: 'frontend',
      });

      return {
        name: linkItem.provider,
        link,
      };
    });

    // item.lyrics = await this.songsLyrics.getCachedLyrics(songResponse);

    return { ...item, links };
  }

  parseSongId(id: string): SongIdData {
    return JSON.parse(Buffer.from(id, 'base64').toString());
  }
}
