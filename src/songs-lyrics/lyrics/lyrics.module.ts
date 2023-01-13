import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeniusService } from './genius.service';
import { LyricsService } from './lyrics.service';
import { SpotifyLyricsService } from './spotify.service';

@Module({
  providers: [
    LyricsService,
    GeniusService,
    ConfigService,
    SpotifyLyricsService,
  ],
  exports: [LyricsService],
})
export class LyricsModule {}
