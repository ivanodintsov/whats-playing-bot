import { Module } from '@nestjs/common';
import { TrackPlaylistService } from './track-playlist.service';

@Module({
  providers: [TrackPlaylistService]
})
export class TrackPlaylistModule {}
