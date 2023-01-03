import { Module } from '@nestjs/common';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SpotifyParserService } from './spotify-parser.service';

@Module({
  imports: [SpotifyModule],
  providers: [SpotifyParserService],
  exports: [SpotifyParserService],
})
export class SpotifyParserModule {}
