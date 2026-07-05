import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TokensProcessor } from './tokens/tokens.processor';
import { TokensService } from './tokens/tokens.service';
import { MusicServiceModule } from 'src/music-service/music-service.module';

@Module({
  imports: [
    MusicServiceModule,
    BullModule.registerQueue({
      name: 'spotifyTokens',
    }),
  ],
  providers: [SpotifyService, ConfigService, TokensProcessor, TokensService],
  controllers: [SpotifyController],
  exports: [SpotifyService],
})
export class SpotifyModule {}
