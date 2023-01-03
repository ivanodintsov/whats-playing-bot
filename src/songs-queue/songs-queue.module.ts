import { Module } from '@nestjs/common';
import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsQueueProcessor } from './songs-queue.processor';

@Module({
  imports: [SongsLyricsModule],
  providers: [SongsQueueProcessor],
})
export class SongsQueueModule {}
