import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SequelizeModule } from '@nestjs/sequelize';
import { SongLyric, SongLyricSchema } from 'src/schemas/song-lyric.schema';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { GeniusService } from './genius.service';
import { TrackLyric } from './models/song-lyric.model';
import { SongsLyricsService } from './songs-lyrics.service';

@Module({
  imports: [
    SequelizeModule.forFeature([TrackLyric]),
    MongooseModule.forFeature([
      {
        name: SongLyric.name,
        schema: SongLyricSchema,
      },
    ]),
    BullModule.registerQueue({
      name: SONGS_QUEUE,
    }),
    SongWhipModule,
    SongsInfoModule,
  ],
  providers: [SongsLyricsService, GeniusService, ConfigService],
  exports: [SongsLyricsService],
})
export class SongsLyricsModule {}
