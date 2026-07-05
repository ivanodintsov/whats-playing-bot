import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoundcloudController } from './soundcloud.controller';
import { SoundcloudService } from './soundcloud.service';
import { MusicServiceModule } from 'src/music-service/music-service.module';

@Module({
  imports: [MusicServiceModule],
  controllers: [SoundcloudController],
  providers: [SoundcloudService, ConfigService],
  exports: [SoundcloudService],
})
export class SoundcloudModule {}
