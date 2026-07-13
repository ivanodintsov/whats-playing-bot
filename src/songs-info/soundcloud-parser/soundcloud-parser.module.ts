import { Module } from '@nestjs/common';
import { SoundcloudParserService } from './soundcloud-parser.service';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { HttpModule } from '@nestjs/axios';
import { SpotifyParserModule } from '../spotify-parser/spotify-parser.module';

@Module({
  imports: [MusicServicesModule, HttpModule, SpotifyParserModule],
  providers: [SoundcloudParserService],
  exports: [SoundcloudParserService],
})
export class SoundcloudParserModule {}
