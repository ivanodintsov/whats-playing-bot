import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SongLyric, SongLyricSchema } from 'src/schemas/song-lyric.schema';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { GeniusService } from './genius.service';
import { SongsLyricsService } from './songs-lyrics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SongLyric.name,
        schema: SongLyricSchema,
      },
    ]),
    BullModule.registerQueue({
      name: SONGS_QUEUE,
    }),
  ],
  providers: [SongsLyricsService, GeniusService, ConfigService],
  exports: [SongsLyricsService],
})
export class SongsLyricsModule {}
