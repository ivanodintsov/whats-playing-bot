import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SpotifyServiceService } from './spotify-service.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Spotify, SpotifySchema } from 'src/schemas/spotify.schema';
import { SpotifyServiceController } from './spotify-service.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: Spotify.name,
        schema: SpotifySchema,
      },
    ]),
  ],
  providers: [SpotifyServiceService, ConfigService],
  controllers: [SpotifyServiceController],
  exports: [SpotifyServiceService],
})
export class SpotifyServiceModule {}
