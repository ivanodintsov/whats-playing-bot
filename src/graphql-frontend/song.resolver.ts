import { Args, Query, Resolver, Float } from '@nestjs/graphql';
import { Song } from './models/song.model';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as R from 'ramda';
import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';
import { SongsService } from 'src/views/songs/songs.service';

export type SongIdData = {
  id: string;
  service: string;
  platform: string;
};

@Resolver(of => Song)
export class SongResolver {
  constructor(
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly songWhip: SongWhipService,
    private readonly songsLyrics: SongsLyricsService,
    private readonly songsService: SongsService,
  ) {}

  @Query(returns => Song)
  async song(@Args('songId', { type: () => String }) songId: string) {
    const data = this.parseSongId(songId);
    const songResponse = await this.songWhip.getSongById(data.id);

    const item = songResponse.toObject();

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
          id: songResponse._id,
          service: key,
          platform: 'frontend',
        });

        return {
          name: key,
          link: headLink.link,
        };
      }),
    )(item.links);

    item.lyrics = await this.songsLyrics.getCachedLyrics(songResponse);

    return item;
  }

  parseSongId(id: string): SongIdData {
    return JSON.parse(Buffer.from(id, 'base64').toString());
  }
}
