import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { SongsLyricsService } from './songs-lyrics.service';
import { TrackLyricsModule } from './track-lyrics/track-lyrics.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SONGS_QUEUE,
    }),
    TrackLyricsModule,
  ],
  providers: [SongsLyricsService],
  exports: [SongsLyricsService],
})
export class SongsLyricsModule {}
