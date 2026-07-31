import { Module } from '@nestjs/common';
import { InternalMusicPlaybackQueueModule } from './internal-music-playback-queue/internal-music-playback-queue.module';

@Module({
  providers: [],
  imports: [InternalMusicPlaybackQueueModule],
  exports: [InternalMusicPlaybackQueueModule],
})
export class InternalMusicServiceModule {}
