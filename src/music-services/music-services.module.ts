import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MusicServicesService } from './music-services.service';
import { SpotifyServiceModule } from './spotify-service/spotify-service.module';
import { DeezerServiceModule } from './deezer-service/deezer-service.module';
import { JwtModule } from '@nestjs/jwt';
import { MusicServicesController } from './music-services.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('TELEGRAM_JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    SpotifyServiceModule,
    DeezerServiceModule,
  ],
  providers: [MusicServicesService],
  exports: [MusicServicesService],
  controllers: [MusicServicesController],
})
export class MusicServicesModule {}
