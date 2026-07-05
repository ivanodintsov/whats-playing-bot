import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MusicServiceToken } from './models/music-service-token.model';

@Module({
  imports: [SequelizeModule.forFeature([MusicServiceToken])],
  exports: [SequelizeModule],
})
export class MusicServiceModule {}
