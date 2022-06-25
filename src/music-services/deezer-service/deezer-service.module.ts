import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeezerServiceService } from './deezer-service.service';
import { DeezerServiceController } from './deezer-service.controller';
import { SpotifyServiceModule } from '../spotify-service/spotify-service.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DeezerTokens,
  DeezerTokensSchema,
} from './schemas/deezer-tokens.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        return {
          baseURL: 'https://api.deezer.com',
        };
      },
    }),
    MongooseModule.forFeature([
      {
        name: DeezerTokens.name,
        schema: DeezerTokensSchema,
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('TELEGRAM_JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
    SpotifyServiceModule,
  ],
  providers: [DeezerServiceService, ConfigService],
  controllers: [DeezerServiceController],
  exports: [DeezerServiceService],
})
export class DeezerServiceModule {}
