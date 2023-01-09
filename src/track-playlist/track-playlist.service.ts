import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SharedTrack, SharedTrackDomain } from './models/shared-track.model';

@Injectable()
export class TrackPlaylistService {
  constructor(
    @InjectModel(SharedTrack)
    private readonly sharedTrackModel: typeof SharedTrack,
  ) {}

  addSong(data: Omit<SharedTrackDomain, 'id'>) {
    return this.sharedTrackModel.create(data);
  }
}
