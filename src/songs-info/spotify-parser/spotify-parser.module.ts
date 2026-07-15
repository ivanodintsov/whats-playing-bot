import { Module } from '@nestjs/common';
import { SpotifyParserService } from './spotify-parser.service';
import { MusicServicesModule } from 'src/music-services/music-services.module';

@Module({
  imports: [MusicServicesModule],
  providers: [SpotifyParserService],
  exports: [SpotifyParserService],
})
export class SpotifyParserModule {}
