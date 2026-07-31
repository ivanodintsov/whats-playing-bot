import { CustomHttpModule } from 'src/custom-http/custom-http.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { SONGS_QUEUE } from 'src/songs-queue/constants';
import { SongsLyricsService } from './songs-lyrics.service';
import { TrackLyricsModule } from './track-lyrics/track-lyrics.module';
import { SongsLyricsController } from './songs-lyrics.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SONGS_QUEUE,
    }),
    TrackLyricsModule,
    CustomHttpModule,
    ConfigModule,
  ],
  providers: [SongsLyricsService],
  exports: [SongsLyricsService],
  controllers: [SongsLyricsController],
})
export class SongsLyricsModule {}
