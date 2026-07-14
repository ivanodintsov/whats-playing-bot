import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MusicServiceToken } from './models/music-service-token.model';
import { MusicServicesService } from './music-services.service';
import { SpotifyService } from './spotify-service/spotify-service.service';
import { MusicServicesController } from './music-services.controller';
import { GA4Module } from 'src/utils/ga4';
import { BullModule } from '@nestjs/bull';
import { MUSIC_SERVICE_QUEUE } from './music-service-core/constants';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { SoundcloudService } from './soundcloud-service/soundcloud-service.service';
import { HttpModule } from '@nestjs/axios';
import { SongsModule } from 'src/songs-info/songs/songs.module';
import { TokensPoolModule } from 'src/songs-info/tokens-pool/tokens-pool.module';

@Module({
  imports: [
    GA4Module.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          apiSecret: configService.get<string>('MP_API_SECRET'),
          measurementId: configService.get<string>('GTM_ID'),
          clientId: configService.get<string>('MP_CLIENT_ID'),
        };
      },
    }),
    SequelizeModule.forFeature([MusicServiceToken, TelegramUser]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('MUSIC_SERVICE_JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: MUSIC_SERVICE_QUEUE,
    }),
    HttpModule,
    SongsModule,
    TokensPoolModule,
  ],
  providers: [
    MusicServicesService,
    SpotifyService,
    ConfigService,
    SoundcloudService,
  ],
  exports: [
    SequelizeModule,
    SpotifyService,
    MusicServicesService,
    SoundcloudService,
  ],
  controllers: [MusicServicesController],
})
export class MusicServicesModule {}
