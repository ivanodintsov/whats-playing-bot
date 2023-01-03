import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [SongWhipModule, SongsLyricsModule],
  providers: [ConfigService, SongsService],
  controllers: [SongsController],
  exports: [SongsService],
})
export class SongsModule {}
