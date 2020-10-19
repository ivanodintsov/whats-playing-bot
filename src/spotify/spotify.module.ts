import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Spotify, SpotifySchema } from 'src/schemas/spotify.schema';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Spotify.name,
        schema: SpotifySchema,
      }
    ]),
  ],
  providers: [SpotifyService, ConfigService],
  controllers: [SpotifyController],
  exports: [SpotifyService]
})
export class SpotifyModule {}
