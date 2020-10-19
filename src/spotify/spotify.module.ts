import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Spotify, SpotifySchema } from 'src/schemas/spotify.schema';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TokensProcessor } from './tokens/tokens.processor';
import { TokensService } from './tokens/tokens.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Spotify.name,
        schema: SpotifySchema,
      }
    ]),
    BullModule.registerQueue({
      name: 'spotifyTokens',
      redis: {
        host: 'datatracker-redis',
        port: 6379,
        db: 1,
      },
    }),
  ],
  providers: [SpotifyService, ConfigService, TokensProcessor, TokensService],
  controllers: [SpotifyController],
  exports: [SpotifyService]
})
export class SpotifyModule {}
