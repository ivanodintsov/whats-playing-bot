import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [SpotifyService, ConfigService],
  controllers: [SpotifyController],
})
export class SpotifyModule {}
