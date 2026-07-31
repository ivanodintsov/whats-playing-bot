import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InternalMusicPlaybackQueueService } from './internal-music-playback-queue.service';
import { PlaybackQueue } from './internal-music-playback-queue.model';

@Module({
  imports: [SequelizeModule.forFeature([PlaybackQueue])],
  providers: [InternalMusicPlaybackQueueService],
  exports: [InternalMusicPlaybackQueueService],
})
export class InternalMusicPlaybackQueueModule {}
