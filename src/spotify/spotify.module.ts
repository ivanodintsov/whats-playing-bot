import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { TokensProcessor } from './tokens/tokens.processor';
import { TokensService } from './tokens/tokens.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { SpotifyToken } from './models/spotify-token.model';

@Module({
  imports: [
    SequelizeModule.forFeature([SpotifyToken]),
    BullModule.registerQueue({
      name: 'spotifyTokens',
    }),
  ],
  providers: [SpotifyService, ConfigService, TokensProcessor, TokensService],
  controllers: [SpotifyController],
  exports: [SpotifyService],
})
export class SpotifyModule {}
