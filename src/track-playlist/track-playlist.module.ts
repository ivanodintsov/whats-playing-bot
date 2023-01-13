import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SharedTrack } from './models/shared-track.model';
import { TrackPlaylistService } from './track-playlist.service';

@Module({
  imports: [SequelizeModule.forFeature([SharedTrack])],
  providers: [TrackPlaylistService],
  exports: [TrackPlaylistService],
})
export class TrackPlaylistModule {}
