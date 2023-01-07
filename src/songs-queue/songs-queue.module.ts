import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SONGS_QUEUE } from './constants';
import { SongsQueueProcessor } from './songs-queue.processor';

@Module({
  imports: [
    SongsLyricsModule,
    SongsInfoModule,
    BullModule.registerQueue({
      name: SONGS_QUEUE,
      limiter: {
        max: 1,
        duration: 10000,
      },
    }),
  ],
  providers: [SongsQueueProcessor],
})
export class SongsQueueModule {}
