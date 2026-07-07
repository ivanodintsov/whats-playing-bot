import { Module } from '@nestjs/common';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { ImportDbService } from './import-db.service';
import { ImportDbController } from './import-db.controller';
import { TrackPlaylistModule } from 'src/track-playlist/track-playlist.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { UsersModule } from 'src/users/users.module';
import { TrackStatisticsModule } from 'src/songs-info/track-statistics/track-statistics.module';
import { ConfigModule } from '@nestjs/config';
import { MusicServicesModule } from 'src/music-services/music-services.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TelegramUser]),
    SongsInfoModule,
    TrackPlaylistModule,
    UsersModule,
    MusicServicesModule,
    TrackStatisticsModule,
    ConfigModule,
  ],
  providers: [ImportDbService],
  controllers: [ImportDbController],
})
export class ImportDbModule {}
