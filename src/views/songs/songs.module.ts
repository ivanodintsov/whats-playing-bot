import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsQueueModule } from 'src/songs-queue/songs-queue.module';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [
    SongWhipModule,
    SongsLyricsModule,
    SongsInfoModule,
    SongsQueueModule,
  ],
  providers: [ConfigService, SongsService],
  controllers: [SongsController],
  exports: [SongsService],
})
export class SongsModule {}
