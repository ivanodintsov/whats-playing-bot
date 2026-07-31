import { Module } from '@nestjs/common';
import { SoundcloudParserService } from './soundcloud-parser.service';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { SpotifyParserModule } from '../spotify-parser/spotify-parser.module';
import { TokensPoolModule } from '../tokens-pool/tokens-pool.module';

@Module({
  imports: [MusicServicesModule, SpotifyParserModule, TokensPoolModule],
  providers: [SoundcloudParserService],
  exports: [SoundcloudParserService],
})
export class SoundcloudParserModule {}
