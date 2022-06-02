import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Spotify, SpotifySchema } from 'src/schemas/spotify.schema';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TokensProcessor } from './tokens/tokens.processor';
import { TokensService } from './tokens/tokens.service';
import {
  SpotifyPlaylist,
  SpotifyPlaylistSchema,
} from 'src/schemas/playlist.schema';
import { SpotifyPlaylistService } from './playlist.service';
import {
  SpotifyChatPlaylist,
  SpotifyChatPlaylistSchema,
} from 'src/schemas/chat-playlist.schema';
import { SongInfo, SongInfoSchema } from 'src/schemas/song-info.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Spotify.name,
        schema: SpotifySchema,
      },
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
    BullModule.registerQueue({
      name: 'spotifyTokens',
    }),
  ],
  providers: [
    SpotifyService,
    ConfigService,
    TokensProcessor,
    TokensService,
    SpotifyPlaylistService,
  ],
  controllers: [SpotifyController],
  exports: [SpotifyService, SpotifyPlaylistService],
})
export class SpotifyModule {}
