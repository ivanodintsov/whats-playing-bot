import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MusicServicesService } from './music-services.service';
import { SpotifyServiceModule } from './spotify-service/spotify-service.module';

@Module({
  imports: [ConfigModule, SpotifyServiceModule],
  providers: [MusicServicesService],
  exports: [MusicServicesService],
})
export class MusicServicesModule {}
