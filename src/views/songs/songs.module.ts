import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { SongsController } from './songs.controller';

@Module({
  imports: [SongWhipModule],
  providers: [ConfigService],
  controllers: [SongsController],
})
export class SongsModule {}
