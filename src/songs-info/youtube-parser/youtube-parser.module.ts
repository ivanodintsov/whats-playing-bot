import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SpotifyParserModule } from '../spotify-parser/spotify-parser.module';
import { YoutubeParserService } from './youtube-parser.service';

@Module({
  imports: [SpotifyModule, HttpModule, SpotifyParserModule],
  providers: [YoutubeParserService],
  exports: [YoutubeParserService],
})
export class YoutubeParserModule {}
