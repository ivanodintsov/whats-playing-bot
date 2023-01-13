import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LyricsModule } from '../lyrics/lyrics.module';
import { TrackLyric } from '../models/song-lyric.model';
import { TrackLyricsService } from './track-lyrics.service';

@Module({
  imports: [SequelizeModule.forFeature([TrackLyric]), LyricsModule],
  providers: [TrackLyricsService],
  exports: [TrackLyricsService],
})
export class TrackLyricsModule {}
