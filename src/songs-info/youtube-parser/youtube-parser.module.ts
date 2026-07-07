import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SpotifyParserModule } from '../spotify-parser/spotify-parser.module';
import { YoutubeParserService } from './youtube-parser.service';
import { MusicServicesModule } from 'src/music-services/music-services.module';

@Module({
  imports: [MusicServicesModule, HttpModule, SpotifyParserModule],
  providers: [YoutubeParserService],
  exports: [YoutubeParserService],
})
export class YoutubeParserModule {}
