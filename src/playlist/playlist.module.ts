import { Module } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SpotifyPlaylist,
  SpotifyPlaylistSchema,
} from 'src/schemas/playlist.schema';
import {
  SpotifyChatPlaylist,
  SpotifyChatPlaylistSchema,
} from 'src/schemas/chat-playlist.schema';
import { SongInfo, SongInfoSchema } from 'src/schemas/song-info.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SpotifyPlaylist.name,
        schema: SpotifyPlaylistSchema,
      },
      {
        name: SpotifyChatPlaylist.name,
        schema: SpotifyChatPlaylistSchema,
      },
      {
        name: SongInfo.name,
        schema: SongInfoSchema,
      },
    ]),
  ],
  providers: [PlaylistService],
  exports: [PlaylistService],
})
export class PlaylistModule {}
