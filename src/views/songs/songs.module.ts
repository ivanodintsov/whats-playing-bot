import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { LinksModule } from 'src/songs-info/links/links.module';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
// import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsQueueModule } from 'src/songs-queue/songs-queue.module';
import { SongsController } from './songs.controller';

@Module({
  imports: [
    SongWhipModule,
    // SongsLyricsModule,
    SongsInfoModule,
    SongsQueueModule,
    LinksModule,
  ],
  providers: [ConfigService],
  controllers: [SongsController],
})
export class SongsModule {}
